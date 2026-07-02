import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// removeJSX
// ✅ Target removed.
// ✅ Parent remains valid JSX.
describe("removeJSX", () => {
  test("should remove jsx", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "removeJSX",
        payload: {
          filePath,
          componentName: "App",
          targetElement: "a[href='https://vite.dev']",
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
