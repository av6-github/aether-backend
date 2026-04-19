export default {
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.js', '**/*.test.js'],
  collectCoverageFrom: ['src/**/*.js', '!src/**/*.d.js'],
  coverageThreshold: { global: { branches: 70, functions: 70, lines: 70 } },
  transform: {},
};
