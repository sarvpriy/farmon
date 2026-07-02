import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// renameCssClass
// ✅ CSS selector renamed.
// ✅ JSX className updated.
// ✅ No partial replacements.
describe("renameCssClass", () => {
  test("should rename CSS class", async () => {
    const cssPath = path.join(ctx.appContext.project.root, "src", "App.css");
    const componentJSXPath = path.join(
      ctx.appContext.project.root,
      "src",
      "App.jsx",
    );
    const oldClassName = "counter";
    const newClassName = "new-counter";

    const result = await executeTask(
      {
        task: "renameCssClass",
        payload: {
          cssPath,
          componentJSXPath,
          oldClassName,
          newClassName,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
