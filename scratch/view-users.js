const db = require("../backend/config/database");

function viewUsers() {
  console.log("👥 Fetching all registered users and their custom SMTP configuration status...\n");

  const query = `
    SELECT u.id, u.first_name, u.email, u.role, u.status, 
           (SELECT COUNT(*) FROM user_email_configs uec WHERE uec.user_id = u.id) AS is_smtp_configured,
           uec.email_user AS smtp_user, uec.smtp_host, uec.smtp_port
    FROM users u
    LEFT JOIN user_email_configs uec ON u.id = uec.user_id
    ORDER BY u.role, u.id
  `;

  db.query(query, (err, rows) => {
    if (err) {
      console.error("❌ Failed to query users:", err.message);
      process.exit(1);
    }

    console.log("Total registered users found:", rows.length);
    console.log("--------------------------------------------------------------------------------");
    rows.forEach((user, idx) => {
      console.log(`[${idx + 1}] ID: ${user.id} | Name: ${user.first_name} | Role: ${user.role} | Status: ${user.status}`);
      console.log(`    Email: ${user.email}`);
      console.log(`    SMTP Configured: ${user.is_smtp_configured ? "✅ Yes" : "❌ No"}`);
      if (user.is_smtp_configured) {
        console.log(`    Sender Email: ${user.smtp_user} (${user.smtp_host}:${user.smtp_port})`);
      }
      console.log("--------------------------------------------------------------------------------");
    });

    process.exit(0);
  });
}

setTimeout(viewUsers, 1000);
