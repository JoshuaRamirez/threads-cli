const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/tests/**/*.test.ts"],
  transform: {
    ...tsJestTransformCfg,
  },
  moduleNameMapper: {
    "^@joshua2048/threads-core$": "<rootDir>/../core/src/index.ts",
    "^@joshua2048/threads-storage$": "<rootDir>/../storage/src/index.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html"],
};
