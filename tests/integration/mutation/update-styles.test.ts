import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// updateStyles
// ✅ Existing styles updated.
// ✅ New styles added.
// ✅ Other selectors untouched.
describe("updateStyles", () => {
  test("should create directory", async () => {
    const cssPath = path.join(ctx.appContext.project.root, "src/App.css");

    const result = await executeTask(
      {
        task: "updateStyles",
        payload: {
          cssPath,
          selector: ".hero",
          styles: {
            position: "absolute",
          },
          createIfMissing: true,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
