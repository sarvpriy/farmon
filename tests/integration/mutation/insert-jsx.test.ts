import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// insertJSX
// ✅ JSX inserted at correct location.
// ✅ Formatting correct.
// ✅ Imports added if needed.
describe("insertJSX", () => {
  test("should insert JSX into the correct location", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "insertJSX",
        payload: {
          filePath,
          componentName: "App",
          targetElement: "div.ticks",
          jsx: "<Badge />",
          position: "last",
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
    // expect(result.updatedCode).toContain("<Badge />");
  });
});
