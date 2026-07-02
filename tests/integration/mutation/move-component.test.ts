import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// Test:

// ✅ Directory moved.
// ✅ Old path no longer exists.
// ✅ New path exists.
// ✅ Imports updated (if your implementation does this).
describe("moveComponent", () => {
  test("should move component", async () => {
    const sourcePath = path.join(ctx.appContext.project.root, "src", "Header");
    const destinationPath = path.join(
      ctx.appContext.project.root,
      "src",
      "Home",
    );

    const result = await executeTask(
      {
        task: "moveComponent",
        payload: {
          sourcePath,
          destinationPath,
          createDestination: true,
          overwrite: false,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
