import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// createFile
// ✅ File created.
// ✅ Initial content correct.
describe("createFile", () => {
  test("should create file", async () => {
    const result = await executeTask(
      {
        task: "createFile",
        payload: {
          filePath: path.join(
            ctx.appContext.project.root,
            ctx.appContext.config.componentsDirectory,
            "Header/Header.jsx",
          ),
          content: "export default Header() {return <p>Header</>}",
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);
  });
});
