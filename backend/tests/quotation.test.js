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

describe("Quotation Routes", () => {
  describe("GET /api/quotations/from-addresses", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).get("/api/quotations/from-addresses");
      expect(res.statusCode).toBe(401);
    });
    it("should return list of addresses", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, label: "Office", address: "123 St" }]));
      const res = await request(app).get("/api/quotations/from-addresses").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });
  });

  describe("POST /api/quotations/from-addresses", () => {
    it("should fail if label/address missing", async () => {
      const res = await request(app).post("/api/quotations/from-addresses").set("Authorization", `Bearer ${adminToken}`).send({});
      expect(res.statusCode).toBe(400);
    });
    it("should create address", async () => {
      mockDb.query.mockImplementation(mockResolve({ insertId: 5 }));
      const res = await request(app).post("/api/quotations/from-addresses").set("Authorization", `Bearer ${adminToken}`).send({ label: "Warehouse", address: "456 Ave" });
      expect(res.statusCode).toBe(200);
      expect(res.body.id).toBe(5);
    });
  });

  describe("DELETE /api/quotations/from-addresses/:id", () => {
    it("should return 401 without token", async () => {
      const res = await request(app).delete("/api/quotations/from-addresses/1");
      expect(res.statusCode).toBe(401);
    });
    it("should delete address when admin", async () => {
      mockDb.query.mockImplementation(mockResolve({ affectedRows: 1 }));
      const res = await request(app).delete("/api/quotations/from-addresses/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/quotations/", () => {
    it("should list quotations", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Test", grand_total: 1000 }]));
      const res = await request(app).get("/api/quotations/").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });

  describe("GET /api/quotations/:id", () => {
    it("should return single quotation", async () => {
      mockDb.query.mockImplementation(mockResolve([{ id: 1, customer_name: "Test" }]));
      const res = await request(app).get("/api/quotations/1").set("Authorization", `Bearer ${adminToken}`);
      expect(res.statusCode).toBe(200);
    });
  });
});
