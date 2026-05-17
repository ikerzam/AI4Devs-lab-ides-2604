module.exports = {
  roots: ['<rootDir>/src'],
  testEnvironment: 'jsdom',
  testRegex: '(/tests/.*\\.(test|spec))\\.tsx?$',
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': [
      'babel-jest',
      {
        presets: [
          ['@babel/preset-env', { targets: { node: 'current' } }],
          ['@babel/preset-react', { runtime: 'automatic' }],
          '@babel/preset-typescript',
        ],
      },
    ],
  },
  transformIgnorePatterns: [
    // axios v1 and react-router v7 ship ESM that needs transforming under jest
    '/node_modules/(?!(axios|react-router|react-router-dom)/)',
  ],
  setupFiles: ['<rootDir>/src/tests/setup-polyfills.ts'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': '<rootDir>/src/tests/__mocks__/styleMock.js',
    // react-router v7 declares `exports` only; Jest 27 resolves CJS dist directly.
    '^react-router-dom$': '<rootDir>/node_modules/react-router-dom/dist/index.js',
    '^react-router/dom$':
      '<rootDir>/node_modules/react-router/dist/development/dom-export.js',
    '^react-router$':
      '<rootDir>/node_modules/react-router/dist/development/index.js',
  },
  testTimeout: 15000,
};
