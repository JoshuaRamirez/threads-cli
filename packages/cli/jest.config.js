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
    "^@redjay/threads-core$": "<rootDir>/../core/src/index.ts",
    "^@redjay/threads-storage$": "<rootDir>/../storage/src/index.ts",
  },
  collectCoverageFrom: [
    "src/**/*.ts",
    "!src/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "html"],
};
