// Jest harness for Go7 unit tests.
// NOTE: package.json has "type":"module", so the original jest.config.js
// (CommonJS) cannot be loaded. This .cjs config is the working test harness.
// Use: npx jest --config jest.config.cjs
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: ['src/lib/**/*.ts', '!**/*.d.ts'],
  testTimeout: 10000,
};
