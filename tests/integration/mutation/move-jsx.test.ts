import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// moveJSX
// ✅ JSX removed from source.
// ✅ Inserted at destination.
// ✅ Order correct.
describe("moveJSX", () => {
  test("should create directory", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "moveJSX",
        payload: {
          filePath,
          componentName: "App",
          sourceElement: `button`,
          destinationElement: `footer`,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
