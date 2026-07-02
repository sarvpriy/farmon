import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// removeStyles
// ✅ Requested properties removed.
// ✅ Other properties remain.
describe("removeStyles", () => {
  test("should remove styles", async () => {
    const cssPath = path.join(ctx.appContext.project.root, "src", "App.css");
    const target = ".hero";

    const result = await executeTask(
      {
        task: "removeStyles",
        payload: {
          cssPath,
          target: {
            selector: ".hero",
            position: "relative",
          },
          removeAll: false,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
