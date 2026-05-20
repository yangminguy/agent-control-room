/** @type {import('jest').Config} */
const config = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@/(.*)$": "<rootDir>/$1",
  },
  testMatch: ["<rootDir>/__tests__/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/external/"],
  testPathIgnorePatterns: ["<rootDir>/external/"],
};

module.exports = config;
