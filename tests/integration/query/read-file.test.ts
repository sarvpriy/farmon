import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

// import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { AppContext } from "../../../schemas/index.ts";

function setupIntegrationTest() {
  let project: any;
  let appContext: AppContext;

  beforeEach(async () => {
    project = await createTestProject();
    appContext = await createTestAppContext(project.projectDir);
  });

  afterEach(async () => {
    await project.cleanup();
  });

  return {
    get project() {
      return project;
    },

    get appContext() {
      return appContext;
    },
  };
}

const ctx = setupIntegrationTest();
describe("readFile", () => {
  it("should read file contents", async () => {
    const result = await executeQueryTask({
      task: "readFile",
      payload: {
        filePath: path.join(ctx.appContext.project.root, "src/App.jsx"),
      },
    });
    expect(result.content).toContain("function App");
  });
});
