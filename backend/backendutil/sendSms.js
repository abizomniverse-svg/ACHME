const nodemailer = require("nodemailer");

function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
  });
}

let transporter = createTransporter();

transporter.verify((error) => {
  if (error) {
    console.error("OTP email transporter verification failed:", error.message);
  } else {
    console.log("OTP email transporter is ready");
  }
});

const sendWithRetry = async (mailOptions, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      await transporter.sendMail(mailOptions);
      return;
    } catch (err) {
      if (err.code === "ENOTFOUND" || err.code === "ESOCKET") {
        transporter = createTransporter();
      }
      if (i < retries - 1) {
        await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
      } else {
        console.error("OTP email failed after", retries, "attempts:", err.message);
        throw err;
      }
    }
  }
};

const sendEmailOtp = async (email, otp) => {
  await sendWithRetry({
    from: `"OTP Service" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Registration OTP",
    html: `
      <h2>Your OTP is ${otp}</h2>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });
};

module.exports = sendEmailOtp;
