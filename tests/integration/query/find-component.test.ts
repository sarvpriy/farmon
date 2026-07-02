import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
// import { AppContext } from "../../../schemas/index.ts";

// function setupIntegrationTest() {
//   let project: any;
//   let appContext: AppContext;

//   beforeEach(async () => {
//     project = await createTestProject();
//     appContext = await createTestAppContext(project.projectDir);
//   });

//   afterEach(async () => {
//     await project.cleanup();
//   });

//   return {
//     get project() {
//       return project;
//     },

//     get appContext() {
//       return appContext;
//     },
//   };
// }

const ctx = setupIntegrationTest();

describe("findComponent", () => {
  it("should find the given component in the project", async () => {
    const componentName = "App";
    const result = await executeQueryTask({
      task: "findComponent",
      payload: {
        componentName,
        projectRoot: ctx.appContext.project.root,
      },
    });
    expect(result.componentName).toBe(componentName);
  });
});
