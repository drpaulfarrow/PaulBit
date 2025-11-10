module.exports = {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  collectCoverage: true,
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/server.js',
    '!src/**/index.js',
  ],
  coverageDirectory: '<rootDir>/coverage',
  clearMocks: true,
  verbose: false,
};

