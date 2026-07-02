/*

readFile

readPackageJson

readReadme

readComponent

findComponent

findSymbolReferences

searchText

listComponents

listFiles

readDirectory

getRuntimeSnapshot

getRuntimeError

*/

import { AppContext, ERROR_CODES } from "../../schemas/index.js";
import { LoomaError } from "../../server/error.js";
import sse from "../../server/sse.js";
import fs from "fs";
import path from "path";

/**
 * Description: Reads the contents of a file.
 */
async function readFile({ filePath }: { filePath: string }) {
  const content = await fs.promises.readFile(filePath, "utf8");

  return {
    filePath,
    content,
  };
}

/**
 * Description: Reads package.json.
 */
async function readPackageJson({ projectRoot }) {
  sse.emitInfo("Reading package.json...");

  const filePath = path.join(projectRoot, "package.json");

  const content = await fs.promises.readFile(filePath, "utf8");

  return {
    filePath,
    content: content,
  };
}

/**
 * Description: Reads README.md.
 */
async function readReadme({ projectRoot }) {
  sse.emitInfo("Reading README...");
  const candidates = ["README.md", "readme.md", "Readme.md"];

  const fileName = candidates.find((name) =>
    fs.existsSync(path.join(projectRoot, name)),
  );

  if (!fileName) {
    throw new LoomaError(ERROR_CODES.FILE_NOT_FOUND, "README.md not found.");
  }

  const filePath = path.join(projectRoot, fileName);

  const content = await fs.promises.readFile(filePath, "utf8");

  return {
    filePath,
    content,
  };
}

async function findComponent({
  componentName,
  projectRoot,
}: {
  componentName: string;
  projectRoot: string;
}) {
  sse.emitInfo("Locating component...");
  const filePaths = await findFiles(
    projectRoot,
    new RegExp(`${componentName}\\.(jsx|tsx)$`),
  );

  return {
    componentName,
    filePaths,
  };
}

// async function findComponent({ query }: { query: string }): Promise<{
//   matches: {
//     componentId: string;
//     componentName: string;
//     jsxPath: string;
//     cssPath?: string;
//   }[];
// }> {
// return {} }

async function readComponent(
  { componentId }: { componentId: string },
  context: AppContext,
) {
  sse.emitInfo("Reading component source...");

  const component = context.componentRegistry[componentId];

  if (!component) {
    throw new Error("Component not found");
  }

  return {
    componentId,
    componentName: component.componentName,
    jsx: await fs.promises.readFile(component.filePath, "utf8"),
    css: component.cssPath
      ? await fs.promises.readFile(component.cssPath, "utf8")
      : undefined,
  };
  // const { filePaths } = await findComponent(
  //   {
  //     componentName,
  //   },
  //   context,
  // );

  // if (!filePaths.length) {
  //   throw new LoomaError(
  //     ERROR_CODES.COMPONENT_NOT_FOUND,
  //     `Component '${componentName}' not found.`,
  //   );
  // }

  // const filePath = filePaths[0];

  // const content = await fs.promises.readFile(filePath, "utf8");

  // return {
  //   componentName,
  //   filePath,
  //   content,
  // };
}

async function findFiles(arg0: string, arg1: RegExp) {
  return [];
  // throw new Error("Function not implemented.");
}
// async function getRuntimeSnapshot() {
//   return runtimeSnapshotStore.getRuntimeSnapshot();
// }

// async function getRuntimeError() {
//   return {
//     error: runtimeErrorStore.getRuntimeError(),
//   };
// }

async function findSymbolReferences(
  { symbol }: { symbol: string },
  context: AppContext,
): Promise<{
  symbol: string;
  references: {
    filePath: string;
    line: number;
    column: number;
    snippet: string;
  }[];
}> {
  const references = [];

  const projectFiles = await getProjectFiles(context.project.root);

  for (const file of projectFiles) {
    const content = await fs.promises.readFile(file, "utf8");

    const lines = content.split("\n");

    lines.forEach((line, index) => {
      const column = line.indexOf(symbol);

      if (column !== -1) {
        references.push({
          filePath: file,
          line: index + 1,
          column: column + 1,
          snippet: line.trim(),
        });
      }
    });
  }

  return {
    symbol,
    references,
  };
}

async function searchText(
  { query }: { query: string },
  context: AppContext,
): Promise<{
  query: string;
  matches: {
    filePath: string;
    line: number;
    snippet: string;
  }[];
}> {
  const matches = [];

  const projectFiles = await getProjectFiles(context.project.root);

  for (const file of projectFiles) {
    const content = await fs.promises.readFile(file, "utf8");

    const lines = content.split("\n");

    lines.forEach((line, index) => {
      if (line.includes(query)) {
        matches.push({
          filePath: file,
          line: index + 1,
          snippet: line.trim(),
        });
      }
    });
  }

  return {
    query,
    matches,
  };
}

function listComponents({ context }: { context: AppContext }) {
  return {
    components: Object.values(context.componentRegistry).map((component) => ({
      componentId: component.componentId,
      componentName: component.componentName,
      jsxPath: component.filePath,
      cssPath: component.cssPath,
    })),
  };
}

// function getRuntimeSnapshot(): {
//   url: string;
//   title: string;
//   selectedComponentId?: string;
//   viewport: {
//     width: number;
//     height: number;
//   };
//   consoleErrors: number;
// } {
//   return {
//     url: runtime.url,
//     title: runtime.title,
//     selectedComponentId: runtime.selectedComponentId,
//     viewport: runtime.viewport,
//     consoleErrors: runtime.consoleErrors.length,
//   };
// }

// function getRuntimeError(): {
//   errors: {
//     message: string;
//     stack?: string;
//     timestamp: string;
//   }[];
// } {
//   return {
//     errors: runtime.consoleErrors,
//   };
// }

async function getProjectFiles(root) {
  const files = [];

  async function walk(directory) {
    const entries = await fs.promises.readdir(directory, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  await walk(root);

  return files;
}

export default {
  readReadme,
  readPackageJson,
  readFile,
  findComponent,
  readComponent,
  findSymbolReferences,
  searchText,
  listComponents,
  getProjectFiles,
};
