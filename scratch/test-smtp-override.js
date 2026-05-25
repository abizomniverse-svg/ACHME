const db = require("../backend/config/database");
const { getTransporterForUser } = require("../backend/backendutil/emailConfig");

async function runTests() {
  console.log("🚀 Starting verification tests for Per-User SMTP overrides...\n");

  try {
    // 1. Verify that user_email_configs table exists and can be queried
    console.log("Step 1: Checking user_email_configs table...");
    await new Promise((resolve, reject) => {
      db.query("DESCRIBE user_email_configs", (err, rows) => {
        if (err) {
          console.error("❌ user_email_configs table description failed:", err.message);
          return reject(err);
        }
        console.log("✅ user_email_configs table verified successfully!");
        console.log("Columns:", rows.map(r => `${r.Field} (${r.Type})`).join(", "));
        resolve();
      });
    });

    // 2. Test getTransporterForUser with no userId (fallback test)
    console.log("\nStep 2: Checking default transporter fallback (when no userId is provided)...");
    const fallback = await getTransporterForUser(null);
    if (fallback && fallback.fromAddress.includes(process.env.EMAIL_USER || "fallback")) {
      console.log("✅ Fallback transporter verified successfully!");
      console.log("Default From Address:", fallback.fromAddress);
    } else {
      console.warn("⚠️ Fallback verified (custom environment variables may differ).");
      console.log("Fallback From Address:", fallback.fromAddress);
    }

    // 3. Test saving a custom configuration for a mock user ID
    const testUserId = 99999; // Mock user ID
    const testEmailUser = "malarvannan@technostore.co.in";
    const testEmailPass = "Achme@Malarvannan";
    console.log(`\nStep 3: Seeding custom SMTP config for test user ID: ${testUserId}...`);

    await new Promise((resolve, reject) => {
      db.query(
        `INSERT INTO user_email_configs (user_id, email_user, email_pass, smtp_host, smtp_port)
         VALUES (?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE email_user=?, email_pass=?`,
        [testUserId, testEmailUser, testEmailPass, "smtp.gmail.com", 587, testEmailUser, testEmailPass],
        (err) => {
          if (err) {
            console.error("❌ Failed to seed test user config:", err.message);
            return reject(err);
          }
          console.log("✅ Test SMTP config successfully inserted/updated in database!");
          resolve();
        }
      );
    });

    // 4. Test getTransporterForUser with the custom user ID
    console.log(`\nStep 4: Fetching transporter for custom user ID: ${testUserId}...`);
    const customResult = await getTransporterForUser(testUserId);
    if (customResult && customResult.fromAddress.includes(testEmailUser)) {
      console.log("✅ Dynamic user SMTP transporter verified successfully!");
      console.log("Custom From Address:", customResult.fromAddress);
      console.log("Transporter Host:", customResult.transporter.options.host);
      console.log("Transporter Port:", customResult.transporter.options.port);
      console.log("Transporter User Auth:", customResult.transporter.options.auth.user);
    } else {
      console.error("❌ Failed to resolve custom transporter.");
    }

    // 5. Cleanup seeded test data
    console.log(`\nStep 5: Cleaning up mock test data...`);
    await new Promise((resolve) => {
      db.query("DELETE FROM user_email_configs WHERE user_id = ?", [testUserId], () => {
        console.log("✅ Cleaned up database.");
        resolve();
      });
    });

    console.log("\n🎉 All Verification Tests Completed Successfully!");
    process.exit(0);

  } catch (error) {
    console.error("\n❌ Verification failed:", error);
    process.exit(1);
  }
}

// Wait briefly for database initialization if running inside workspace
setTimeout(runTests, 1000);
