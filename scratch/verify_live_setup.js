// FILE: scratch/verify_live_setup.js
// Verification Script for Windows Zero-Config Live Setup
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2");

console.log("\n==============================================");
console.log("🔍 RUNNING PRODUCTION ENVIRONMENT VERIFICATION");
console.log("==============================================\n");

const backendEnvPath = path.join(__dirname, "../backend/.env");
if (!fs.existsSync(backendEnvPath)) {
  console.error("❌ backend/.env file is missing!");
  process.exit(1);
}

// 1. Read and parse Env Configuration
const envContent = fs.readFileSync(backendEnvPath, "utf8");
const env = {};
envContent.split("\n").forEach((line) => {
  const parts = line.split("=");
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join("=").trim();
    env[key] = val;
  }
});

console.log("📁 Backend Env Config Check:");
const expected = {
  PORT: "82",
  NODE_ENV: "production",
  DB_HOST: "127.0.0.1",
  DB_PORT: "3306",
  DB_USER: "achme_user",
  DB_PASS: "AchmeSecure@2024",
  DB_NAME: "achme"
};

let envOk = true;
for (const [k, expectedVal] of Object.entries(expected)) {
  if (env[k] !== expectedVal) {
    console.warn(`  ⚠️  Mismatch in backend/.env: ${k}. Expected: '${expectedVal}', Found: '${env[k]}'`);
    envOk = false;
  } else {
    console.log(`  ✅ ${k} correctly configured as '${env[k]}'`);
  }
}
if (envOk) {
  console.log("  🚀 backend/.env settings verified successfully!\n");
} else {
  console.warn("  ⚠️  Some environment variables differ from expected settings. Double-check if this is intentional.\n");
}

// 2. Test MySQL Connection
console.log("🔌 Testing database connectivity...");
const dbConfig = {
  host: env.DB_HOST || "127.0.0.1",
  port: Number(env.DB_PORT) || 3306,
  user: env.DB_USER || "achme_user",
  password: env.DB_PASS || "AchmeSecure@2024"
};

const connection = mysql.createConnection(dbConfig);
connection.connect((err) => {
  if (err) {
    console.error("❌ Failed to connect to MySQL database!");
    console.error(`   Details: ${err.message}`);
    console.error("   Please ensure MySQL is running locally and the user 'achme_user' has correct permissions.");
    console.log("\n==============================================");
    process.exit(1);
  }

  console.log("  ✅ Successfully connected to local MySQL Database server.");
  
  // Check if database exists
  connection.query(`SHOW DATABASES LIKE '${env.DB_NAME || "achme"}'`, (showErr, rows) => {
    if (showErr) {
      console.error("❌ Failed to search for database schema:", showErr.message);
      connection.end();
      process.exit(1);
    }
    
    if (rows.length > 0) {
      console.log(`  ✅ Database schema '${env.DB_NAME || "achme"}' verified and is ready!`);
    } else {
      console.log(`  ℹ️  Database schema '${env.DB_NAME || "achme"}' is not created yet. 'start_live.bat' will automatically create it at start.`);
    }
    
    connection.end();
    checkFiles();
  });
});

function checkFiles() {
  console.log("\n📂 Checking file integrity:");
  
  const files = [
    { name: "start_live.bat", path: path.join(__dirname, "../start_live.bat") },
    { name: "backend/db_init.js", path: path.join(__dirname, "../backend/db_init.js") },
    { name: "backend/server.js", path: path.join(__dirname, "../backend/server.js") },
    { name: "frontend/src/config.js", path: path.join(__dirname, "../frontend/src/config.js") },
    { name: "frontend/src/App.js", path: path.join(__dirname, "../frontend/src/App.js") }
  ];

  let filesOk = true;
  files.forEach((f) => {
    if (fs.existsSync(f.path)) {
      console.log(`  ✅ ${f.name} exists and is verified.`);
    } else {
      console.error(`  ❌ Missing: ${f.name} at expected path ${f.path}`);
      filesOk = false;
    }
  });

  if (filesOk) {
    console.log("\n==============================================");
    console.log("🌟 ALL CHECKS PASSED! Setup is ready to run live.");
    console.log("   Ready to launch double-clicking start_live.bat!");
    console.log("==============================================\n");
    process.exit(0);
  } else {
    console.error("\n❌ Setup verification failed due to missing files.");
    console.log("==============================================\n");
    process.exit(1);
  }
}
