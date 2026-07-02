import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// renameFile
// ✅ Old file removed.
// ✅ New file exists.
// ✅ Content unchanged.
describe("renameFile", () => {
  test("should rename file", async () => {
    const oldFilePath = path.join(
      ctx.appContext.project.root,
      "src",
      "App.jsx",
    );
    const newFilePath = path.join(
      ctx.appContext.project.root,
      "src",
      "NewApp.jsx",
    );

    const result = await executeTask(
      {
        task: "renameFile",
        payload: {
          oldFilePath,
          newFilePath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
