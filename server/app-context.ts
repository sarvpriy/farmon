import { ComponentRegistry, ProjectDependencies } from "../schemas/index.js";
import path from "path";
import fs from "fs";

import type { AppContext } from "../schemas/index.js";

import helpers from "../execute/helpers/general.js";
import { loadConfig } from "./config.js";

import { fileURLToPath } from "node:url";
import sse from "./sse.js";

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

// export const runtimeContext = {
//   rootDir: path.resolve(__dirname, ".."),
//   workersDir: path.resolve(__dirname, "..", "workers"),
//   uiDir: path.resolve(__dirname, "..", "ui"),
// };

// because its purpose is "Where is looma installed?", not "What's happening at runtime?"
interface InstallationContext {
  rootDir: string;
  workersDir: string;
  uiDir: string;
}

let initContext: InstallationContext;

// this are looma paths
export function initializeContext() {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  initContext = {
    rootDir: path.resolve(__dirname, ".."),
    workersDir: path.resolve(__dirname, "..", "workers"),
    uiDir: path.resolve(__dirname, "..", "ui"),
  };
}

export function getInitializationContext() {
  return initContext;
}

// import { Command } from "commander";

// export async function createAppContext({ configPath }) {
//   // const {
//   //   values: { project: projectPath },
//   // } = parseArgs({
//   //   args: process.argv.slice(2),
//   //   options: {
//   //     project: {
//   //       type: "string",
//   //       short: "p",
//   //     },
//   //   },
//   // });

//   const program = new Command();

//   program
//     .command("dev")
//     .option("-c, --config <path>")
//     .action((options) => {
//       console.log(options.config);
//     });

//   program.parse();

//   // const projectPath = process.argv

//   console.log(projectPath);

//   // await loadConfig(projectPath);
//   const config = await loadConfig(projectPath);
//   // console.log(process.cwd());
//   console.log(config);

//   const SERVER_PORT = config.serverPort ?? 3001;

//   // -----------------------------------------------------
//   // Build project-level caches once during server startup.
//   // -----------------------------------------------------

//   const componentRegistry: ComponentRegistry = helpers.createComponentRegistry({
//     componentsPath: path.join(PROJECT_ROOT, config.componentsDirectory),
//   });

//   const projectDependencies: ProjectDependencies =
//     helpers.getProjectDependencies({
//       projectRoot: PROJECT_ROOT,
//     });

//   const appContext: AppContext = {
//     componentRegistry,
//     projectDependencies,
//     config,
//     // historyManager,
//     // logger,
//     // eventBus,
//     // planner,
//   };

//   return appContext;
// }

export async function createAppContext({ projectRoot }): Promise<AppContext> {
  const config = await loadConfig({
    projectRoot,
  });

  const componentRegistry: ComponentRegistry = helpers.createComponentRegistry({
    componentsPath: path.join(projectRoot, config.componentsDirectory),
    projectRoot,
  });
  //   console.log(componentRegistry);

  const projectDependencies: ProjectDependencies =
    helpers.getProjectDependencies({
      projectRoot: projectRoot,
    });
  //   console.log(projectDependencies);

  const loomaRoot =
    process.env.NODE_ENV === "development"
      ? path.resolve(import.meta.dirname, "..")
      : path.resolve(import.meta.dirname, "..");
  return {
    project: {
      root: path.resolve(projectRoot),
      undoPath: path.resolve(
        path.join(projectRoot, ".looma", "history", "undo.json"),
      ),
      redoPath: path.resolve(
        path.join(projectRoot, ".looma", "history", "redo.json"),
      ),
      trashDir: path.resolve(path.join(projectRoot, ".looma", "trash")),
      logsDir: path.resolve(path.join(projectRoot, ".looma", "logs")),
    },
    loomaRoot,
    config,
    componentRegistry,
    projectDependencies,
  };
}

/**
 * Returns full component context using Looma component id.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function is the bridge between:
 *
 * Frontend Selection
 *        ↓
 * Backend Source Context
 *
 * Frontend sends:
 *
 * componentId
 *
 * Example:
 *
 * "cmp_header"
 *
 * Using registry, this function returns:
 *
 * - component metadata
 * - component source code
 * - css code
 * - hierarchy info
 *
 * This returned object becomes:
 *
 * AI CONTEXT
 *
 * for user commands like:
 *
 * - "make it red"
 * - "add about us link"
 * - "increase padding"
 *
 * ------------------------------------------------------------
 * WHY THIS IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Instead of sending:
 *
 * entire project
 *
 * to LLM,
 * we send:
 *
 * scoped component context
 *
 * This massively improves:
 *
 * - speed
 * - accuracy
 * - determinism
 * - token efficiency
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentId
 * Looma component id.
 *
 * Example:
 *
 * "cmp_header"
 *
 * @param {Object} params.registry
 * Runtime component registry.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object|null}
 *
 * Returns:
 *
 * {
 *   componentId,
 *   componentName,
 *   filePath,
 *   cssPath,
 *   importPath,
 *   parentComponent,
 *   childComponents,
 *   exported,
 *   props,
 *   rootElement,
 *   lastUpdated,
 *   componentCode,
 *   cssCode
 * }
 *
 * Returns null if component not found.
 *
 */
export function getComponentContext({ componentId, componentRegistry }) {
  sse.emitInfo("Collecting context...");
  // ----------------------------------------------------------
  // STEP 1:ß
  // Find componentRegistry entry
  // ----------------------------------------------------------

  const component = componentRegistry[componentId];

  // ----------------------------------------------------------
  // STEP 2:
  // Handle missing component
  // ----------------------------------------------------------

  if (!component) {
    return null;
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read component source code
  // ----------------------------------------------------------

  let componentCode = "";

  if (component.filePath && fs.existsSync(component.filePath)) {
    componentCode = fs.readFileSync(component.filePath, "utf8");
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Read css source code
  // ----------------------------------------------------------

  let cssCode = "";

  if (component.cssPath && fs.existsSync(component.cssPath)) {
    cssCode = fs.readFileSync(component.cssPath, "utf8");
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Return enriched context object
  // ----------------------------------------------------------

  // sse.emitProgress(
  //   `Component: ${component.componentId}:${component.componentName}`,
  // );

  return {
    componentId: component.componentId,

    componentName: component.componentName,

    filePath: component.filePath,

    cssPath: component.cssPath,

    importPath: component.importPath,

    parentComponent: component.parentComponent,

    childComponents: component.childComponents,

    exported: component.exported,

    props: component.props,

    rootElement: component.rootElement,

    lastUpdated: component.lastUpdated,

    componentCode,

    cssCode,
  };
}
