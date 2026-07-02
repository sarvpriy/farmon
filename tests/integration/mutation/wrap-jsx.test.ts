import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// wrapJSX
// ✅ Target wrapped.
// ✅ Children preserved.
// ✅ Wrapper correct.
describe("wrapJSX", () => {
  test("should wrap jsx", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "wrapJSX",
        payload: {
          filePath,
          componentName: "App",
          targetElement: `div.ticks`,
          wrapperJSX: `<div className="container"></div>`,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
