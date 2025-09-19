module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  testEnvironmentOptions: { console: 'console' },
  roots: ['<rootDir>/tests'],
  testMatch: ['**/__tests__/**/*.ts?(x)', '**/?(*.)+(spec|test).ts?(x)'],
  transform: {
    '^.+\.tsx?$': 'ts-jest',
  },
  testPathIgnorePatterns: ['/node_modules/', '/tests/e2e/'],
  collectCoverageFrom: [
    'electron/**/*.ts',
    'src/**/*.ts',
    'src/**/*.tsx',
    '!**/*.d.ts',
    '!**/node_modules/**'
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov', 'html'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '\.css$': 'identity-obj-proxy',
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  testTimeout: 10000,
};