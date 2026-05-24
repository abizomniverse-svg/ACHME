const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

const sql = `
CREATE TABLE IF NOT EXISTS task_targets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  yearly_target DECIMAL(15,2),
  monthly_target DECIMAL(15,2) DEFAULT 0,
  carry_forward DECIMAL(15,2) DEFAULT 0,
  effective_target DECIMAL(15,2) DEFAULT 0,
  created_by_admin TINYINT(1) DEFAULT 1,
  teammember_id INT DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS task_achievements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  achieved_count INT DEFAULT 0,
  achieved_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_target_month (target_id, month_year)
);

CREATE TABLE IF NOT EXISTS task_updates (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT,
  user_name VARCHAR(255),
  target_id INT NOT NULL,
  month_year VARCHAR(7) NOT NULL,
  count INT DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
`;

db.connect((err) => {
  if (err) {
    console.error("❌ DB Connection Failed:", err.message);
    process.exit(1);
  }
  console.log("✅ Connected to database:", process.env.DB_NAME);

  const queries = sql.split(';').map(q => q.trim()).filter(q => q.length > 0);
  
  let completed = 0;
  queries.forEach(query => {
    db.query(query, (err) => {
      if (err) console.error("❌ SQL Error:", err.message);
      else console.log("✅ Query executed successfully.");
      
      completed++;
      if (completed === queries.length) {
        console.log("🎉 All target tables verified/created!");
        db.end();
      }
    });
  });
});