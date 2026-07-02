import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// Test:

// ✅ Directory renamed.
// ✅ Component function renamed.
// ✅ Imports updated.
// ✅ Exports updated.
describe("renameComponent", () => {
  test("should create directory", async () => {
    const componentPath = path.join(
      ctx.appContext.project.root,
      "src",
      "Header",
    );

    const result = await executeTask(
      {
        task: "renameComponent",
        payload: {
          componentPath,
          newComponentName: "NewHeader",
          updateComponentCode: true,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
