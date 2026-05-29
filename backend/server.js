const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");
const cors = require("cors");
const http = require("http");
const db = require("./config/database");
const { initSocket } = require("./sockets/chatsockets");
const { initNotificationsSocket } = require("./sockets/notifications");

// ── Fail fast if required env vars are missing ──────────────────────────────
const REQUIRED_ENV = ["DB_HOST", "DB_USER", "DB_PASS", "DB_NAME", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Missing required environment variables: ${missing.join(", ")}`);
  console.error("   Copy backend/.env.example to backend/.env and fill in the values.");
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
module.exports = app;

// ── CORS ─────────────────────────────────────────────────────────────────────
// Dynamically echo back any origin in self-hosted mode to avoid CORS errors with dynamic IPs/hostnames
const allowedOrigin = process.env.ALLOWED_ORIGIN || "*";
const dynamicOrigin = (origin, callback) => {
  callback(null, true);
};
app.use(cors({
  origin: dynamicOrigin,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true,
}));
const corsOrigins = dynamicOrigin;

app.use(express.json());

app.get(["/health", "/api/health"], (req, res) => {
  res.json({
    ok: true,
    database: "ready",
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

app.use((req, res, next) => {
  const originalJson = res.json.bind(res);
  const shouldEmit = ["POST", "PUT", "PATCH", "DELETE"].includes(req.method);

  res.json = (body) => {
    if (shouldEmit && res.statusCode < 400) {
      const io = req.app.get("io");
      if (io) {
        io.emit("data_changed", {
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          at: new Date().toISOString()
        });
      }
    }
    return originalJson(body);
  };

  next();
});

// ── Routes ───────────────────────────────────────────────────────────────────
app.use("/api/Telecalls", require("./routes/telecallRoutes"));
app.use("/api/Walkins", require("./routes/walkinRoutes"));
app.use("/api/quotations", require("./routes/quotationRoutes"));
app.use("/api/auth", require("./routes/authRoutes"));
app.use("/api/task", require("./routes/taskRoutes"));
app.use("/api/Fields", require("./routes/fieldRoutes"));
app.use("/api/fields", require("./routes/fieldRoutes")); // lowercase alias
app.use("/api/client", require("./routes/newclient"));
app.use("/api/invoice", require("./routes/invoice"));
app.use("/api/payments", require("./routes/payment"));
app.use("/api/estimate-client", require("./routes/newestimates"));
app.use("/api/estimate", require("./routes/estimate"));
app.use("/api/contract", require("./routes/contract"));
app.use("/api/teammember", require("./routes/team"));
app.use("/api/performainvoice", require("./routes/performaInvoiceRoutes"));
app.use("/api/estimate-invoice", require("./routes/estimateInvoiceRoutes"));
app.use("/api/service-estimation", require("./routes/serviceEstimationRoutes"));
app.use("/api/call-reports", require("./routes/callReportRoutes"));
app.use("/api/services", require("./routes/serviceRoutes"));
app.use("/api/leads", require("./routes/leadManagementRoutes"));
app.use("/api/targets", require("./routes/targetRoutes"));
app.use("/api/amc", require("./routes/amcRoutes"));
app.use("/api/reports", require("./routes/reportRoutes"));
app.use("/api/notifications", require("./routes/notificationRoutes"));
app.use("/api/setup", require("./routes/setupRoutes"));

app.use("/uploads", express.static("uploads"));

// ── Serve React Frontend statically in production ───────────────────────────
if (process.env.NODE_ENV === "production") {
  const buildPath = path.join(__dirname, "../frontend/build");
  app.use(express.static(buildPath));
  
  // React BrowserRouter catch-all support
  app.get("/{*splat}", (req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads") || req.path.startsWith("/socket.io")) {
      return next();
    }
    res.sendFile(path.join(buildPath, "index.html"), (err) => {
      if (err) {
        res.status(500).send("React build directory not found. Please compile frontend before running.");
      }
    });
  });
}

// ── Start ─────────────────────────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 3000;

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`❌ Port ${PORT} is already in use. Either stop the process currently listening on port ${PORT} or set a different PORT in backend/.env.`);
    process.exit(1);
  }
  throw error;
});

function startServer() {
  return db.ready.then(() => {
    const io = initSocket(server, corsOrigins);
    const notificationIO = initNotificationsSocket(io, corsOrigins);
    app.set("io", io);
    app.set("notificationIO", io);
    require("./backendutil/reminderScheduler").startSchedulers();
    server.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Server running: http://0.0.0.0:${PORT} [${process.env.NODE_ENV || "development"}]`);

      // Optional Port 80 redirect server for client domain convenience
      if (process.env.NODE_ENV === "production" && PORT === 82) {
        const redirectApp = express();
        redirectApp.get("/{*splat}", (req, res) => {
          const host = req.headers.host ? req.headers.host.split(":")[0] : "achme.com";
          res.redirect(`http://${host}:82${req.originalUrl}`);
        });
        http.createServer(redirectApp).listen(80, "0.0.0.0", () => {
          console.log(`🚀 Automatic redirect server active on port 80 (routing http://achme.com -> http://achme.com:82)`);
        }).on("error", (err) => {
          if (err.code === "EADDRINUSE") {
            console.log(`ℹ️ Port 80 is occupied (redirect server bypassed; access CRM using port 82)`);
          } else {
            console.warn(`⚠️ Redirect server port 80 failed:`, err.message);
          }
        });
      }
    });
  }).catch((error) => {
    console.error("Database is not ready. Server not started.");
    console.error(`Check DB_HOST, DB_PORT, DB_USER, DB_PASS, and DB_NAME in backend/.env. Details: ${error.message}`);
    process.exit(1);
  });
}

app.startServer = startServer;

if (process.env.NODE_ENV !== "test") {
  startServer();
}
