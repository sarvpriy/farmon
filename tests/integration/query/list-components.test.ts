import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";

const ctx = setupIntegrationTest();

describe("listComponents", () => {
  console.log("App context:", ctx.appContext);
  it("should list the components in the project", async () => {
    const result = await executeQueryTask({
      task: "listComponents",
      payload: {
        context: ctx.appContext,
      },
    });

    expect(result.components.map((c: any) => c.componentName)).toContain("App");
  });
});
