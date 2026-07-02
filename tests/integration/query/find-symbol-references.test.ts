import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";

const ctx = setupIntegrationTest();

describe("findSymbolReferences", () => {
  it("should find the symbol reference", async () => {
    const result = await executeQueryTask(
      {
        task: "findSymbolReferences",
        payload: {
          symbol: "Your questions, answered",
        },
      },
      ctx.appContext,
    );
    expect(result.references[0].snippet).toContain(
      "<p>Your questions, answered</p>",
    );
  });
});
