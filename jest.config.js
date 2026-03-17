module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: 'tsconfig.test.json' }],
    '.+/@noble/ed25519/index\\.js$': ['ts-jest', { tsconfig: 'tsconfig.test.json', useESM: false }],
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@noble/)',
  ],
};
