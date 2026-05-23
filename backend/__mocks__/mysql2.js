const mockDb = {
  connect: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  query: jest.fn((sql, values, cb) => {
    if (typeof values === "function") {
      cb = values;
      values = [];
    }
    if (cb) {
      cb(null, []);
    } else {
      return { on: jest.fn(), emit: jest.fn() };
    }
  }),
  changeUser: jest.fn((opts, cb) => {
    if (cb) cb(null);
  }),
  ping: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  end: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  on: jest.fn(),
  beginTransaction: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  commit: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  rollback: jest.fn((cb) => {
    if (cb) cb(null);
  }),
  promise: jest.fn(() => ({
    query: jest.fn((sql, params) => Promise.resolve([[], []])),
  })),
};

module.exports = {
  createConnection: jest.fn(() => mockDb),
  _mockDb: mockDb,
};
