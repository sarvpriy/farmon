import { createAppContext } from "../../server/app-context.ts";

export async function createTestAppContext(projectDir: string) {
  return createAppContext({
    projectRoot: projectDir,
  });
}
