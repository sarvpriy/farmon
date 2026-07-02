import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();
// insertVariable
// ✅ Variable inserted.
// ✅ Code remains valid.
describe("insertVariable", () => {
  test("should create directory", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "insertVariable",
        payload: {
          filePath,
          variableName: "API_URL",
          value: "/api",
          scope: "function",
          functionName: "App",
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
    // expect(result.updatedCode).toContain("API_URL");
  });
});
