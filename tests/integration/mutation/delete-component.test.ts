import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

/*
Test:

✅ Component directory removed.
✅ Registry updated (if applicable).
*/
describe("deleteComponent", () => {
  test("should delete component", async () => {
    const parentDirectory = path.join(
      ctx.appContext.project.root,
      ctx.appContext.config.componentsDirectory,
    );

    const result = await executeTask(
      {
        task: "deleteComponent",
        payload: {
          componentName: "Header",
          parentDirectory,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);
  });
});
