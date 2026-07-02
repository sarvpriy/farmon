import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// replaceJSX
// ✅ Target JSX replaced.
// ✅ Surrounding JSX unchanged.
describe("replaceJSX", () => {
  test("should replace jsx", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "replaceJSX",
        payload: {
          filePath,
          componentName: "App",
          targetElement: "main",
          newJSX: '<main data-farmon-id="cmp_app"></main>',
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
