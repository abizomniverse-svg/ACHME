const request = require("supertest");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const app = require("../server");

const mockDb = mysql._mockDb;
const adminToken = jwt.sign({ id: 1, role: "admin", first_name: "Admin" }, process.env.JWT_SECRET);

const mockResolve = (result) => (sql, values, cb) => {
  if (typeof values === "function") { cb = values; values = []; }
  cb(null, result);
};

beforeEach(() => { mockDb.query.mockReset(); });

describe("Telecall Routes", () => {
  describe("GET /api/Telecalls", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/Telecalls");
      expect(res.statusCode).toBe(401);
    });
    it("should list telecalls for admin", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "John", mobile_number: "123" }]));
      const res = await request(app).get("/api/Telecalls").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/Telecalls/:id", () => {
    it("should return single telecall", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "John", created_by: 1 }]));
      const res = await request(app).get("/api/Telecalls/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
