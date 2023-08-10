const logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

module.exports = {
  format: {
    colorize: jest.fn(),
    combine: jest.fn(),
    errors: jest.fn(),
    label: jest.fn(),
    timestamp: jest.fn(),
    prettyPrint: jest.fn(),
  },
  createLogger: jest.fn().mockReturnValue(logger),
  transports: {
    Console: jest.fn(),
  },
};
