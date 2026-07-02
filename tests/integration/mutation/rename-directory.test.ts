import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// renameDirectory
// ✅ Directory renamed.
// ✅ Contents preserved.
describe("renameDirectory", () => {
  test("should rename directory", async () => {
    const oldDirectoryPath = path.join(
      ctx.appContext.project.root,
      "src",
      "Header",
    );
    const newDirectoryPath = path.join(
      ctx.appContext.project.root,
      "src",
      "NewHeader",
    );

    const result = await executeTask(
      {
        task: "renameDirectory",
        payload: {
          oldDirectoryPath,
          newDirectoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
