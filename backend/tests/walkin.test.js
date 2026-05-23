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

describe("Walkin Routes", () => {
  describe("GET /api/Walkins", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/Walkins");
      expect(res.statusCode).toBe(401);
    });
    it("should list walkins", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Walk" }]));
      const res = await request(app).get("/api/Walkins").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
