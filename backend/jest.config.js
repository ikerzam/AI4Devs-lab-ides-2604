module.exports = {
  roots: ['<rootDir>/src'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
  },
  testRegex: '(/tests/.*\\.(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    // uuid@14 ships ESM-only and ts-jest cannot transform it.
    // Map it to a tiny CJS stub used during tests.
    '^uuid$': '<rootDir>/src/tests/__mocks__/uuid.ts',
  },
  setupFiles: ['<rootDir>/src/tests/setup-env.ts'],
  testTimeout: 30000,
};