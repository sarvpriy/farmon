import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import mutations from "../../../execute/tasks/mutations.ts";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

/*
Test:

✅ Component directory created.
✅ JSX file created.
✅ CSS file created (if applicable).
✅ index.ts (or configured structure) created.
✅ Generated code is correct.
*/
describe("createComponent", () => {
  const componentCode = `
          function Header() {
            return (
              <div className="header">
                <h1>Header Component</h1>
              </div>
            );
          }
          
          export default Header;
      `;

  test("should create component directory and files", async () => {
    const result = await executeTask(
      {
        task: "createComponent",
        payload: {
          componentName: "Header",
          componentCode,
          parentDirectory: path.join(
            ctx.appContext.project.root,
            ctx.appContext.config.componentsDirectory,
          ),
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);

    expect(fs.existsSync(result.componentDirectoryPath as PathLike)).toBe(true);

    expect(fs.existsSync(result.jsxFilePath as PathLike)).toBe(true);

    expect(fs.existsSync(result.cssFilePath as PathLike)).toBe(true);

    expect(fs.existsSync(result.indexFilePath as PathLike)).toBe(true);

    const jsx = fs.readFileSync(
      result.jsxFilePath as PathOrFileDescriptor,
      "utf8",
    );

    expect(jsx).toContain("Header Component");
  });

  // test("should write component code", async () => {
  //   const result = await executeTask(
  //     {
  //       task: "createComponent",
  //       payload: {
  //         componentName: "Header",
  //         componentCode,
  //         parentDirectory: path.join(ctx.appContext.project.root, ctx.appContext.config.componentsDirectory),
  //       },
  //       taskOutputs: [],
  //     },
  //     ctx.appContext,
  //   );

  //   const jsx = fs.readFileSync(
  //     result.jsxFilePath as PathOrFileDescriptor,
  //     "utf8",
  //   );

  //   expect(jsx).toContain("Header Component");

  // });

  test("should return success true if component already exists", async () => {
    await executeTask(
      {
        task: "createComponent",
        payload: {
          componentName: "Header",
          componentCode:
            "export default function Header(){return <div>Hello</div>}",
          parentDirectory: path.join(
            ctx.appContext.project.root,
            ctx.appContext.config.componentsDirectory,
          ),
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    const result = await executeTask(
      {
        task: "createComponent",
        payload: {
          componentName: "Header",
          componentCode:
            "export default function Header(){return <div>Hello</div>}",
          parentDirectory: path.join(
            ctx.appContext.project.root,
            ctx.appContext.config.componentsDirectory,
          ),
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );

    expect(result.success).toBe(true);
  });
});
