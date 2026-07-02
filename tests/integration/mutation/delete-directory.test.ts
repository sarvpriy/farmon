import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// deleteDirectory
// ✅ Directory removed.
describe("deleteDirectory", () => {
  test("should create directory", async () => {
    const directoryPath = path.join(ctx.appContext.project.root, "src/Header");

    const result = await executeTask(
      {
        task: "deleteDirectory",
        payload: {
          directoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);
  });
});
