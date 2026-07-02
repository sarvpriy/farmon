import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { initializeContext } from "../../server/app-context";

const FIXTURE_DIR = path.resolve(process.cwd(), "tests/fixtures/react-vite");
const TEMP_ROOT = path.resolve(process.cwd(), "tests/temp");

export async function createTestProject() {
  const projectDir = path.join(TEMP_ROOT, randomUUID());

  await fs.cp(FIXTURE_DIR, projectDir, {
    recursive: true,
  });

  initializeContext();

  return {
    projectDir,

    async cleanup() {
      await fs.rm(projectDir, {
        recursive: true,
        force: true,
      });
    },
  };
}

/*

const project = await createTestProject();

try {
    // run Farmon
}
finally {
    await project.cleanup();
}

*/
