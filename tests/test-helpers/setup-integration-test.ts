import { beforeEach, afterEach } from "@jest/globals";

import { createTestProject } from "./create-test-project";
import { createTestAppContext } from "./create-test-app-context";
import { AppContext } from "../../schemas";

export function setupIntegrationTest() {
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
