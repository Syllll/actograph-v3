module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  moduleFileExtensions: ['ts', 'js', 'json', 'node'],
  transform: {
    '^.+\\.ts$': [require.resolve('../packages/core/node_modules/ts-jest'), {
      tsconfig: { target: 'ES2020', module: 'CommonJS', esModuleInterop: true, isolatedModules: true },
    }],
  },
  moduleNameMapper: {
    '^@database/(.*)$': '<rootDir>/src/database/$1',
    '^@services/(.*)$': '<rootDir>/src/services/$1',
    '^@utils/(.*)$': '<rootDir>/src/utils/$1',
    '^@composables/(.*)$': '<rootDir>/src/composables/$1',
    '^@actograph/core$': '<rootDir>/../packages/core/src/index.ts',
    '^@actograph/core/(.*)$': '<rootDir>/../packages/core/src/$1',
  },
};
