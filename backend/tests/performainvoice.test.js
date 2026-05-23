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

describe("Performa Invoice Routes", () => {
  describe("GET /api/performainvoice", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/performainvoice");
      expect(res.statusCode).toBe(401);
    });
    it("should list performa invoices", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Test", grand_total: 500 }]));
      const res = await request(app).get("/api/performainvoice").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("GET /api/performainvoice/:id", () => {
    it("should return single invoice", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Test" }]));
      const res = await request(app).get("/api/performainvoice/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
