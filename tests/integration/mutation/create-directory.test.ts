import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// createDirectory
// ✅ Directory exists.
describe("createDirectory", () => {
  test("should create directory", async () => {
    const directoryPath = path.join(
      ctx.appContext.project.root,
      "src",
      "Header",
    );
    const result = await executeTask(
      {
        task: "createDirectory",
        payload: {
          directoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
    expect(result.directoryPath).toBe(directoryPath);
  });
  test("should not create nested directories", async () => {
    const directoryPath = path.join(
      ctx.appContext.project.root,
      "src/components/Header/styles",
    );
    await executeTask(
      {
        task: "createDirectory",
        payload: {
          directoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(fs.existsSync(directoryPath)).toBe(false);
  });
  test("should not throw if directory already exists", async () => {
    const directoryPath = path.join(
      ctx.appContext.project.root,
      ctx.appContext.config.componentsDirectory,
    );
    // fs.mkdirSync(directoryPath);
    const result = await executeTask(
      {
        task: "createDirectory",
        payload: {
          directoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.message).toBe("Directory already exists");
  });
  test("should create an empty directory", async () => {
    const directoryPath = path.join(ctx.appContext.project.root, "newFolder");
    const result = await executeTask(
      {
        task: "createDirectory",
        payload: {
          directoryPath,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    const files = fs.readdirSync(directoryPath);
    expect(files).toHaveLength(0);
  });
});
