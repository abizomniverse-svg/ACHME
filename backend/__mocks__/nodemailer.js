const mockTransporter = {
  sendMail: jest.fn((mailOptions, cb) => {
    if (cb) {
      cb(null, { messageId: "mock-email-id-12345" });
    }
    return Promise.resolve({ messageId: "mock-email-id-12345" });
  }),
  verify: jest.fn((cb) => {
    if (cb) {
      cb(null);
    }
    return Promise.resolve(true);
  }),
};

module.exports = {
  createTransport: jest.fn(() => mockTransporter),
  _mockTransporter: mockTransporter,
};

