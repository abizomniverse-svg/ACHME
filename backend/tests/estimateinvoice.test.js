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

describe("Estimate Invoice Routes", () => {
  describe("GET /api/estimate-invoice", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/estimate-invoice");
      expect(res.statusCode).toBe(401);
    });
    it("should list estimate invoices", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Est", grand_total: 200 }]));
      const res = await request(app).get("/api/estimate-invoice").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/estimate-invoice/:id", () => {
    it("should return single estimate invoice", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Est" }]));
      const res = await request(app).get("/api/estimate-invoice/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
