import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// deleteFile
// ✅ File removed.
describe("deleteFile", () => {
  test("should delete file", async () => {
    // const directoryPath = path.join(ctx.appContext.project.root, ctx.appContext.config.componentsDirectory);

    const result = await executeTask(
      {
        task: "deleteFile",
        payload: {
          filePath: path.join(
            ctx.appContext.project.root,
            ctx.appContext.config.componentsDirectory,
          ),
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);
  });
});
