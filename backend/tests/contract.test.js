const request = require("supertest");
const jwt = require("jsonwebtoken");
const mysql = require("mysql2");
const app = require("../server");

const mockDb = mysql._mockDb;
const adminToken = jwt.sign({ id: 1, role: "admin" }, process.env.JWT_SECRET);

const mockResolve = (result) => (sql, values, cb) => {
  if (typeof values === "function") { cb = values; values = []; }
  cb(null, result);
};

beforeEach(() => { mockDb.query.mockReset(); });

describe("Contract Routes", () => {
  describe("GET /api/contract", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/contract");
      expect(res.statusCode).toBe(401);
    });
    it("should list contracts", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, client_company: "Acme" }]));
      const res = await request(app).get("/api/contract").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("POST /api/contract/new", () => {
    it("should fail without token", async () => {
      const res = await request(app).post("/api/contract/new").send({});
      expect(res.statusCode).toBe(401);
    });
    it("should fail if required fields missing", async () => {
      const res = await request(app).post("/api/contract/new").set("Authorization", `Bearer ${adminToken}`).send({});
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toContain("required");
    });
    it("should create contract", async () => {
      mockDb.query.mockImplementation(mockResolve({ insertId: 42 }));
      const res = await request(app).post("/api/contract/new").set("Authorization", `Bearer ${adminToken}`).send({
        client_company: "Acme", contract_title: "Support", amount_value: 50000, service_type: "AMC"
      });
      expect(res.statusCode).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.id).toBe(42);
    });
  });
});
