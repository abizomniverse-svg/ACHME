const request = require("supertest");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const mysql = require("mysql2");
const app = require("../server");

const mockDb = mysql._mockDb;

describe("Auth Routes API", () => {
  let adminToken;
  let employeeToken;

  beforeAll(() => {
    // Generate valid JWT tokens for authenticated tests
    adminToken = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET);
    employeeToken = jwt.sign({ id: 2, role: "employee" }, process.env.JWT_SECRET);
  });

  beforeEach(() => {
    // Clear all mocked query implementations before each test
    mockDb.query.mockReset();
  });

  describe("POST /api/auth/send-email-otp", () => {
    it("should fail if email is missing", async () => {
      // Arrange & Act
      const res = await request(app)
        .post("/api/auth/send-email-otp")
        .send({});

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Email required");
    });

    it("should successfully generate and insert OTP", async () => {
      // Arrange
      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (callback) callback(null, { insertId: 1 });
      });

      // Act
      const res = await request(app)
        .post("/api/auth/send-email-otp")
        .send({ email: "user@test.com" });

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe("OTP sent to email");
    });
  });

  describe("POST /api/auth/register", () => {
    it("should fail if registration fields are missing", async () => {
      // Arrange & Act
      const res = await request(app)
        .post("/api/auth/register")
        .send({ first_name: "John", email: "john@test.com" });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("All fields required");
    });

    it("should fail if OTP check returns no match or expired OTP", async () => {
      // Arrange
      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (callback) callback(null, []); // No matching rows
      });

      // Act
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          first_name: "John",
          email: "john@test.com",
          otp: "123456",
          user_password: "password123",
          emp_id: "EMP100"
        });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Invalid or expired OTP");
    });

    it("should succeed with correct register inputs and OTP verification", async () => {
      // Arrange
      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (sql.includes("SELECT * FROM email_otp")) {
          if (callback) callback(null, [{ email: "john@test.com", otp: "123456", expires_at: new Date(Date.now() + 50000) }]);
        } else if (sql.includes("INSERT INTO users")) {
          if (callback) callback(null, { insertId: 456 });
        } else {
          if (callback) callback(null, []);
        }
      });

      // Act
      const res = await request(app)
        .post("/api/auth/register")
        .send({
          first_name: "John",
          email: "john@test.com",
          otp: "123456",
          user_password: "password123",
          emp_id: "EMP100"
        });

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain("Registration successful");
    });
  });

  describe("POST /api/auth/login", () => {
    it("should fail if email is missing", async () => {
      // Arrange & Act
      const res = await request(app)
        .post("/api/auth/login")
        .send({ password: "password123" });

      // Assert
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe("Email / Employee Code required");
    });

    it("should fail if user account is pending admin approval", async () => {
      // Arrange
      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (callback) callback(null, [{
          id: 123,
          first_name: "John",
          email: "john@test.com",
          role: "employee",
          status: "pending"
        }]);
      });

      // Act
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@test.com", password: rawPassword = "password123" });

      // Assert
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe("Account waiting for admin approval");
    });

    it("should login successfully with valid password", async () => {
      // Arrange
      const rawPassword = "password123";
      const hashedPassword = await bcrypt.hash(rawPassword, 10);

      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (callback) callback(null, [{
          id: 123,
          first_name: "John",
          email: "john@test.com",
          role: "employee",
          status: "active",
          user_password: hashedPassword
        }]);
      });

      // Act
      const res = await request(app)
        .post("/api/auth/login")
        .send({ email: "john@test.com", password: rawPassword });

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty("token");
      expect(res.body.user.name).toBe("John");
    });
  });

  describe("GET /api/auth/users", () => {
    it("should fail with 401 if unauthorized (no token provided)", async () => {
      // Arrange & Act
      const res = await request(app)
        .get("/api/auth/users");

      // Assert
      expect(res.statusCode).toBe(401);
    });

    it("should retrieve users list successfully when authorized as admin", async () => {
      // Arrange
      mockDb.query.mockImplementation((sql, values, cb) => {
        const callback = typeof values === "function" ? values : (typeof cb === "function" ? cb : null);
        if (callback) callback(null, [
          { id: 1, first_name: "Admin", email: "admin@test.com", role: "admin", status: "active" },
          { id: 2, first_name: "Employee", email: "emp@test.com", role: "employee", status: "active" }
        ]);
      });

      // Act
      const res = await request(app)
        .get("/api/auth/users")
        .set("Authorization", `Bearer ${adminToken}`);

      // Assert
      expect(res.statusCode).toBe(200);
      expect(res.body.users).toHaveLength(2);
      expect(res.body.users[0].first_name).toBe("Admin");
    });
  });
});
