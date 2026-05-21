/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  setupFiles: ["<rootDir>/jest.setup.js"],
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/external/"],
  testPathIgnorePatterns: ["<rootDir>/external/"],
};

module.exports = config;
