import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// updateVariable
// ✅ check new value.
describe("updateVariable", () => {
  test("should update variable", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");

    const result = await executeTask(
      {
        task: "updateVariable",
        payload: {
          filePath,
          variableName: "API_URL",
          newValue: "/newapi",
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
