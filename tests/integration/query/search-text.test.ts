import { createTestAppContext } from "../../test-helpers/create-test-app-context.ts";
import { createTestProject } from "../../test-helpers/create-test-project.ts";
import { executeQueryTask } from "../../../execute/agents/query-agent.ts";
import path from "path";

import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";

const ctx = setupIntegrationTest();

describe("searchText", () => {
  it("should search the given text", async () => {
    const result = await executeQueryTask(
      {
        task: "searchText",
        payload: {
          query: "Your questions, answered",
        },
      },
      ctx.appContext,
    );
    expect(result.matches).toContainEqual(
      expect.objectContaining({
        snippet: expect.stringContaining("<p>Your questions, answered</p>"),
      }),
    );
  });
});
