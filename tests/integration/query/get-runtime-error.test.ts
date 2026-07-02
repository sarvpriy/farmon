import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";

const ctx = setupIntegrationTest();

describe("getRuntimeError", () => {
  it("should get the runtime error for the given component", async () => {
    const result = await executeQueryTask({
      task: "getRuntimeError",
      payload: {
        componentName: "App",
        projectRoot: ctx.appContext.project.root,
      },
    });
    expect(result.content).toContain("# React + Vite");
  });
});
