const db = require("../config/database");

db.query("SELECT id, customer_name, staff_name, technician, step2_completed, status FROM call_reports ORDER BY id DESC LIMIT 10", (err, rows) => {
  if (err) {
    console.error("Error:", err);
  } else {
    console.log("Database rows in call_reports:");
    console.log(rows);
  }
  db.end();
});
