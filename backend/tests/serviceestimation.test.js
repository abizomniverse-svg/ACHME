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

describe("Service Estimation Routes", () => {
  describe("GET /api/service-estimation", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/service-estimation");
      expect(res.statusCode).toBe(401);
    });
    it("should list service estimations", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Serv", grand_total: 300 }]));
      const res = await request(app).get("/api/service-estimation").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/service-estimation/:id", () => {
    it("should return single estimation", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Serv" }]));
      const res = await request(app).get("/api/service-estimation/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
