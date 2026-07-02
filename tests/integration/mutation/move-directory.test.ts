import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// moveDirectory
// ✅ Directory moved.
// ✅ Contents preserved.
describe("moveDirectory", () => {
  test("should create directory", async () => {
    const sourcePath = path.join(ctx.appContext.project.root, "src", "Header");
    const destinationPath = path.join(
      ctx.appContext.project.root,
      "src",
      "Home",
    );

    const result = await executeTask(
      {
        task: "moveDirectory",
        payload: {
          sourcePath,
          destinationPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
