// Set environment variables for testing
process.env.NODE_ENV = "test";
process.env.DB_HOST = "localhost";
process.env.DB_USER = "test_user";
process.env.DB_PASS = "test_password";
process.env.DB_NAME = "test_db";
process.env.JWT_SECRET = "test_jwt_secret_key_12345";
process.env.PORT = "4000";

// Ensure socket/cron schedules do not keep tests open
jest.setTimeout(10000);
