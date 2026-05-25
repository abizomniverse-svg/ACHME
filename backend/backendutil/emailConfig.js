const nodemailer = require("nodemailer");
const db = require("../config/database");

/**
 * Retrieves the custom SMTP transport options for a given user.
 * If the user has a configured SMTP, it returns the custom nodemailer transporter.
 * Otherwise, it falls back to the default process.env.EMAIL_USER and EMAIL_PASS.
 * 
 * @param {number} userId - The ID of the logged-in user.
 * @returns {Promise<Object>} - Nodemailer Transporter instance and from address.
 */
async function getTransporterForUser(userId) {
  return new Promise((resolve) => {
    if (!userId) {
      // Fallback if no user ID provided (e.g. registration OTP)
      const defaultTransporter = nodemailer.createTransport({
        host: "smtp.gmail.com",
        port: 587,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
        tls: { rejectUnauthorized: false },
      });
      return resolve({
        transporter: defaultTransporter,
        fromAddress: `"Achme Communication" <${process.env.EMAIL_USER}>`,
      });
    }

    db.query(
      "SELECT * FROM user_email_configs WHERE user_id = ?",
      [userId],
      (err, rows) => {
        if (err || !rows || rows.length === 0) {
          // Fallback to global config
          const defaultTransporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false,
            auth: {
              user: process.env.EMAIL_USER,
              pass: process.env.EMAIL_PASS,
            },
            tls: { rejectUnauthorized: false },
          });
          return resolve({
            transporter: defaultTransporter,
            fromAddress: `"Achme Communication" <${process.env.EMAIL_USER}>`,
          });
        }

        const config = rows[0];
        const userTransporter = nodemailer.createTransport({
          host: config.smtp_host || "smtp.gmail.com",
          port: Number(config.smtp_port) || 587,
          secure: Number(config.smtp_port) === 465,
          auth: {
            user: config.email_user,
            pass: config.email_pass,
          },
          tls: { rejectUnauthorized: false },
        });
        return resolve({
          transporter: userTransporter,
          fromAddress: `"Achme Communication" <${config.email_user}>`,
        });
      }
    );
  });
}

module.exports = {
  getTransporterForUser,
};
