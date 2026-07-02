import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";

const ctx = setupIntegrationTest();

describe("getRuntimeSnapshot", () => {
  it("should get the runtime snapshot for the given component", async () => {
    const result = await executeQueryTask({
      task: "getRuntimeSnapshot",
      payload: {
        componentName: "App",
        projectRoot: ctx.appContext.project.root,
      },
    });
    expect(result.content).toContain("# React + Vite");
  });
});
