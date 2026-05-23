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

describe("Call Report Routes", () => {
  describe("GET /api/call-reports", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/call-reports");
      expect(res.statusCode).toBe(401);
    });
    it("should list call reports", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Caller" }]));
      const res = await request(app).get("/api/call-reports").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
