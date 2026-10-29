module.exports = {
  testEnvironment: 'node',
  moduleNameMapper: {
    '^mongodb$': '<rootDir>/mongodb-jest-compat.js',
  },
  maxWorkers: 1,
};
