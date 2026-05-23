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

describe("Target Routes", () => {
  describe("GET /api/targets", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/targets");
      expect(res.statusCode).toBe(401);
    });
    it("should list targets for admin", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, user_id: 1, monthly_target: 100000 }]));
      const res = await request(app).get("/api/targets").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
