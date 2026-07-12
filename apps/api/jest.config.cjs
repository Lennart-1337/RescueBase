module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "node",
  maxWorkers: process.env.CI ? "50%" : 1,
  extensionsToTreatAsEsm: [".ts"],
  transform: {
    "^.+\\.ts$": ["ts-jest", { useESM: true, tsconfig: "tsconfig.json" }]
  },
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    "^@rescuebase/domain$": "<rootDir>/../../packages/domain/src/index.ts"
  },
  testMatch: ["<rootDir>/test/**/*.test.ts"]
};
