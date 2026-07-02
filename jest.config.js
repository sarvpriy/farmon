/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  // 1. Tell ts-jest to use the ESM preset
  preset: "ts-jest",

  // 2. Identify where your test files live
  testEnvironment: "node",

  // 1. Tell Jest to treat .ts files as ESM
  extensionsToTreatAsEsm: [".ts", ".tsx"],

  // 3. Handle modern .js extensions used inside TS file imports
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
    // Maps `@/lib/task.js` to `<rootDir>/lib/task.js`
    "^@/(.*)$": "<rootDir>/$1",
  },

  // 4. Configure ts-jest transformation rules
  transform: {
    "^.+\\.tsx?$": [
      "ts-jest",
      {
        useESM: true, // Forces ts-jest to compile to ESM instead of CommonJS
        // 2. Tell ts-jest to read your tsconfig pathways
        tsconfig: "tsconfig.test.json",
      },
    ],
  },
};
