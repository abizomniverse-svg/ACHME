// FILE: backend/db_init.js
// Automated MySQL Database Pre-Creator for ACHME CRM
const mysql = require("mysql2");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const dbHost = process.env.DB_HOST || "127.0.0.1";
const dbPort = Number(process.env.DB_PORT) || 3306;
const dbUser = process.env.DB_USER || "root";
const dbPass = process.env.DB_PASS || "";
const dbName = process.env.DB_NAME || "achme";

console.log(`\n======================================================`);
console.log(`⚙️  DATABASE PRE-START CHECK`);
console.log(`Connecting to MySQL at ${dbHost}:${dbPort} as ${dbUser}...`);
console.log(`======================================================`);

const connection = mysql.createConnection({
  host: dbHost,
  port: dbPort,
  user: dbUser,
  password: dbPass,
  connectTimeout: 5000
});

connection.connect((err) => {
  if (err) {
    console.error(`\n❌ Failed to connect to MySQL database server:`);
    console.error(`   Message: ${err.message}`);
    console.error(`\n💡 Troubleshooting tips:`);
    console.error(`   1. Make sure your MySQL Server service is running on port ${dbPort}.`);
    console.error(`   2. Verify that the DB_USER and DB_PASS in backend/.env are 100% correct.`);
    console.error(`   3. Verify that the user has host permission (e.g. 'achme_user'@'localhost' or 'achme_user'@'%').\n`);
    process.exit(1);
  }

  console.log(`✅ Connected to MySQL server successfully.`);

  const escapedDbName = dbName.replace(/`/g, "``");
  connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${escapedDbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    (queryErr) => {
      if (queryErr) {
        console.error(`❌ Failed to verify or create database '${dbName}':`, queryErr.message);
        connection.end();
        process.exit(1);
      }

      console.log(`✅ Database '${dbName}' exists or was successfully created.`);
      connection.end();
      console.log(`======================================================\n`);
      process.exit(0);
    }
  );
});
