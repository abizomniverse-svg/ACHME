"use strict";

const path = require("path");
const db = require("../config/database");

// Mock the notification IO helper
const mockEmits = [];
const socketsHelper = require("../sockets/notifications");
socketsHelper.getNotificationIO = () => ({
  emitNotification: (type, data, targetUserId, isAdmin) => {
    console.log(`[Mock Socket Emit] type: ${type}, targetUserId: ${targetUserId}, isAdmin: ${isAdmin}, message: "${data.message}"`);
    mockEmits.push({ type, data, targetUserId, isAdmin });
  }
});

const { runCheckMissed } = require("../backendutil/reminderScheduler");

// Helper to wrap queries in promises
const queryAsync = (sql, params = []) => {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
};

async function runTest() {
  console.log("🚀 Starting Consecutive Missed Reminders Verification Test...");

  // Setup test environment: clean up previous test runs
  await queryAsync("DELETE FROM lead_reminders WHERE reminder_notes = 'CONSECUTIVE_TEST_REMINDER'");
  await queryAsync("DELETE FROM lead_escalations WHERE customer_name = 'Test Lead Consecutive'");
  await queryAsync("DELETE FROM Telecalls WHERE customer_name = 'Test Lead Consecutive'");

  // 1. Create a test lead
  console.log("Step 1: Creating a test Telecall lead...");
  const insertLeadResult = await queryAsync(
    `INSERT INTO Telecalls (customer_name, mobile_number, location_city, call_date, staff_name, created_by, assigned_to, email) 
     VALUES ('Test Lead Consecutive', '1234567890', 'Test City', CURDATE(), 'Test Staff', 1, 1, 'test@example.com')`
  );
  const leadId = insertLeadResult.insertId;
  console.log(`✅ Test lead created with ID: ${leadId}`);

  // Helper to add a reminder
  const addReminder = async (dateOffsetDays, time, status) => {
    const d = new Date();
    d.setDate(d.getDate() + dateOffsetDays);
    const dateStr = d.toISOString().slice(0, 10);
    return await queryAsync(
      `INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, status, missed_count, employee_id)
       VALUES (?, 'telecall', ?, ?, 'CONSECUTIVE_TEST_REMINDER', ?, 0, 1)`,
      [leadId, dateStr, time, status]
    );
  };

  // Setup reminders: 2 missed, 1 pending
  console.log("\nStep 2: Inserting 2 past missed reminders and 1 future pending reminder...");
  await addReminder(-2, "10:00:00", "Missed");
  await addReminder(-1, "10:00:00", "Missed");
  const pendingReminderResult = await queryAsync(
    `INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, status, missed_count, employee_id)
     VALUES (?, 'telecall', CURDATE(), '00:01:00', 'CONSECUTIVE_TEST_REMINDER', 'Pending', 0, 1)`,
    [leadId]
  );
  const pendingReminderId = pendingReminderResult.insertId;

  const remindersBefore = await queryAsync("SELECT * FROM lead_reminders WHERE lead_id = ?", [leadId]);
  console.log("Reminders BEFORE checker runs:", remindersBefore);

  console.log("Running runCheckMissed() with 2 missed + 1 overdue pending (which will be marked missed)...");
  mockEmits.length = 0; // Clear previous mock emits
  
  // Running check missed.
  await new Promise((resolve) => {
    runCheckMissed();
    setTimeout(resolve, 1500); // Wait for async database queries in scheduler
  });

  const remindersAfter = await queryAsync("SELECT * FROM lead_reminders WHERE lead_id = ?", [leadId]);
  console.log("Reminders AFTER checker runs:", remindersAfter);

  const directEscalate = await queryAsync(`
    SELECT lr.lead_id, lr.lead_type, COUNT(*) as total_missed
    FROM lead_reminders lr
    WHERE lr.status = 'Missed'
    GROUP BY lr.lead_id, lr.lead_type
  `);
  console.log("Direct COUNT(*) on Missed reminders:", directEscalate);

  const fullEscalate = await queryAsync(`
    SELECT lr.lead_id, lr.lead_type, COUNT(*) as total_missed,
           COALESCE(t.customer_name, w.customer_name, f.customer_name) as customer_name,
           COALESCE(t.mobile_number, w.mobile_number, f.mobile_number) as mobile_number,
           COALESCE(t.staff_name, w.staff_name, f.staff_name) as staff_name,
           lr.employee_id as employee_id
    FROM lead_reminders lr
    LEFT JOIN Telecalls t ON t.id = lr.lead_id AND lr.lead_type = 'telecall'
    LEFT JOIN Walkins w ON w.id = lr.lead_id AND lr.lead_type = 'walkin'
    LEFT JOIN fields f ON f.id = lr.lead_id AND lr.lead_type = 'field'
    WHERE lr.status = 'Missed'
    GROUP BY lr.lead_id, lr.lead_type, lr.employee_id, t.customer_name, w.customer_name, f.customer_name, t.mobile_number, w.mobile_number, f.mobile_number, t.staff_name, w.staff_name, f.staff_name
  `);
  console.log("Full Escalate query results:", fullEscalate);

  // Verify DB state
  const escalations = await queryAsync("SELECT * FROM lead_escalations WHERE lead_id = ? AND lead_type = 'telecall'", [leadId]);
  console.log("\nVerifying escalation created in DB:");
  console.log(escalations);

  console.log("\nVerifying socket notifications sent:");
  console.log(`Total notifications sent: ${mockEmits.length}`);
  
  if (escalations.length === 1 && escalations[0].missed_count === 3 && escalations[0].missed_threshold_reached === 1 && mockEmits.length === 2) {
    console.log("✅ SUCCESS: Escalation created with count 3, threshold reached = 1, and exactly 2 notifications emitted (1 for admin, 1 for employee)!");
  } else {
    console.error("❌ FAILURE: Incorrect escalation status or notifications sent count.");
    process.exit(1);
  }

  // Running checker again to verify ONCE-OFF behavior (no duplicate spams)
  console.log("\nStep 3: Running runCheckMissed() again to ensure once-off notification behavior...");
  mockEmits.length = 0;
  await new Promise((resolve) => {
    runCheckMissed();
    setTimeout(resolve, 1500);
  });

  console.log(`Total notifications sent on second run: ${mockEmits.length}`);
  if (mockEmits.length === 0) {
    console.log("✅ SUCCESS: No duplicate spammed notifications were sent on subsequent run!");
  } else {
    console.error("❌ FAILURE: Sent duplicate notifications!");
    process.exit(1);
  }

  // Adding a 4th consecutive missed reminder
  console.log("\nStep 4: Adding a 4th consecutive missed reminder to verify it updates count but doesn't notify again...");
  const pending4Result = await queryAsync(
    `INSERT INTO lead_reminders (lead_id, lead_type, reminder_date, reminder_time, reminder_notes, status, missed_count, employee_id)
     VALUES (?, 'telecall', CURDATE(), '00:02:00', 'CONSECUTIVE_TEST_REMINDER', 'Pending', 0, 1)`,
    [leadId]
  );
  
  mockEmits.length = 0;
  await new Promise((resolve) => {
    runCheckMissed();
    setTimeout(resolve, 1500);
  });

  const updatedEscalations = await queryAsync("SELECT * FROM lead_escalations WHERE lead_id = ? AND lead_type = 'telecall'", [leadId]);
  console.log("Updated Escalation:");
  console.log(updatedEscalations);
  console.log(`Total notifications sent on 4th miss: ${mockEmits.length}`);

  if (updatedEscalations[0].missed_count === 4 && mockEmits.length === 0) {
    console.log("✅ SUCCESS: Missed count updated to 4 in database, and no additional alerts were sent!");
  } else {
    console.error("❌ FAILURE: Missed count did not update properly or spammed notification.");
    process.exit(1);
  }

  // Clean up
  console.log("\nStep 5: Cleaning up test data...");
  await queryAsync("DELETE FROM lead_reminders WHERE reminder_notes = 'CONSECUTIVE_TEST_REMINDER'");
  await queryAsync("DELETE FROM lead_escalations WHERE customer_name = 'Test Lead Consecutive'");
  await queryAsync("DELETE FROM Telecalls WHERE customer_name = 'Test Lead Consecutive'");
  console.log("🧹 Cleanup complete.");

  console.log("\n🎉 ALL CONSECUTIVE MISSED REMINDER TESTS PASSED SUCCESSFULLY! 🎉");
  db.end();
}

runTest().catch(err => {
  console.error("❌ TEST RUNTIME ERROR:", err);
  db.end();
});
