import fs from "fs";
import path from "path";
import healpers from "../../execute/helpers/general.js";

import { ERROR_CODES } from "../../schemas/index.js";
import type {
  TaskPayload,
  TaskReturn,
  TaskResponse,
  ExecutionContext,
  AppContext,
} from "../../schemas/index.js";

import finders from "./finders.js";
import { LoomaError } from "../../server/error.js";

/**
 * Validator: Ensures that a library exists inside package.json.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function guarantees that a dependency exists in either:
 *
 * - dependencies
 * OR
 * - devDependencies
 *
 * If the library already exists:
 * - nothing changes
 *
 * If the library does not exist:
 * - it gets added
 * - but you have to do npm install explecitily
 *
 * ------------------------------------------------------------
 * WHY "ENSURE" IS BETTER THAN "INCLUDE"
 * ------------------------------------------------------------
 *
 * "includeLibrary" suggests:
 * - blindly insert
 *
 * "ensureLibrary" means:
 * - verify existence first
 * - avoid duplicates
 * - maintain deterministic state
 *
 * This is the same idea as:
 * - ensureImport
 * - ensureDirectory
 * - ensureVariable
 *
 * ------------------------------------------------------------
 * Useful commands
 * ------------------------------------------------------------
 * add routing: ensureLibrary("react-router-dom")
 * add tailwind: ensureLibrary("tailwindcss")
 * add redux: ensureLibrary("@reduxjs/toolkit")
 * add charts: ensureLibrary("recharts")
 * add icons: ensureLibrary("lucide-react")
 * add form validation: ensureLibrary("zod")
 * add animations: ensureLibrary("framer-motion")
 *
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * This function ONLY updates package.json.
 *
 * It DOES NOT:
 * - run npm install
 * - run yarn install
 * - download packages
 *
 * Installation should be a separate responsibility.
 *
 * ------------------------------------------------------------
 * EXAMPLE
 * ------------------------------------------------------------
 *
 * ensureLibrary({
 *   projectPath: "/my-app",
 *   libraryName: "react-router-dom",
 *   version: "^7.0.0"
 * });
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.projectPath
 * Absolute or relative path of the project root.
 *
 * @param {string} params.libraryName
 * Name of the npm package.
 *
 * @param {string} params.version
 * Version to store in package.json.
 *
 * @param {"dependencies"|"devDependencies"} [params.dependencyType]
 * Which dependency section should contain the package.
 *
 * defaults to:
 * "dependencies"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   modified: boolean,
 *   packageJson: Object
 * }}
 *
 * modified:
 * true  -> package.json changed
 * false -> package already existed
 *
 */
function ensureLibrary(
  { libraryName, version = "v1.0.0" }: TaskPayload<"ensureLibrary">,
  context: AppContext,
): { success: boolean } | { success: boolean; message: string } {
  if (
    !Object.prototype.hasOwnProperty.call(
      healpers.getProjectDependencies({
        projectRoot: context.project.root,
      }).allPackages,
      libraryName,
    )
  ) {
    const message = `Package ${libraryName} in not installed. Please install it`;
    // informUser({
    //   message,
    // });
    return {
      success: false,
      message,
    };
  }

  return {
    success: true,
  };

  // ----------------------------------------------------------
  // STEP 1:
  // Build absolute path to package.json
  // ----------------------------------------------------------

  // const packageJsonPath = path.join(projectPath, "package.json");

  // // ----------------------------------------------------------
  // // STEP 2:
  // // Verify package.json exists
  // // ----------------------------------------------------------

  // if (!fs.existsSync(packageJsonPath)) {
  //   throw new Error(`package.json not found at: ${packageJsonPath}`);
  // }

  // // ----------------------------------------------------------
  // // STEP 3:
  // // Read package.json file as text
  // // ----------------------------------------------------------

  // const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");

  // // ----------------------------------------------------------
  // // STEP 4:
  // // Parse JSON string into JS object
  // // ----------------------------------------------------------

  // const packageJson = JSON.parse(packageJsonContent);

  // // ----------------------------------------------------------
  // // STEP 5:
  // // Ensure dependency section exists
  // //
  // // Example:
  // //
  // // {
  // //   dependencies: {}
  // // }
  // //
  // // If missing, create empty object
  // // ----------------------------------------------------------

  // if (!packageJson[dependencyType]) {
  //   packageJson[dependencyType] = {};
  // }

  // // ----------------------------------------------------------
  // // STEP 6:
  // // Check if library already exists
  // // ----------------------------------------------------------

  // const alreadyExists = packageJson[dependencyType][libraryName];

  // // ----------------------------------------------------------
  // // STEP 7:
  // // If already exists -> return unchanged
  // // ----------------------------------------------------------

  // if (alreadyExists) {
  //   return {
  //     success: false,
  //     packageJson,
  //   };
  // }

  // // ----------------------------------------------------------
  // // STEP 8:
  // // Add library with version
  // //
  // // Example:
  // //
  // // "react-router-dom": "^7.0.0"
  // // ----------------------------------------------------------

  // packageJson[dependencyType][libraryName] = version;

  // // ----------------------------------------------------------
  // // STEP 9:
  // // Sort dependencies alphabetically
  // //
  // // WHY?
  // //
  // // Deterministic ordering:
  // // - cleaner git diffs
  // // - stable formatting
  // // - easier debugging
  // // ----------------------------------------------------------

  // packageJson[dependencyType] = Object.fromEntries(
  //   Object.entries(packageJson[dependencyType]).sort(([a], [b]) =>
  //     a.localeCompare(b)
  //   )
  // );

  // // ----------------------------------------------------------
  // // STEP 10:
  // // Convert object back into formatted JSON string
  // //
  // // JSON.stringify arguments:
  // //
  // // null -> no replacer
  // // 2    -> 2-space indentation
  // // ----------------------------------------------------------

  // const updatedContent = JSON.stringify(packageJson, null, 2);

  // // ----------------------------------------------------------
  // // STEP 11:
  // // Write updated package.json back to disk
  // // ----------------------------------------------------------

  // fs.writeFileSync(packageJsonPath, `${updatedContent}\n`, "utf-8");

  // // ----------------------------------------------------------
  // // STEP 12:
  // // Return success metadata
  // // ----------------------------------------------------------

  // return {
  //   success: true,
  //   packageJson,
  // };
}

/**
* Validator: Ensures that a component style file exists.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function guarantees that:
*
* Component.css
*
* exists for a given component.
*
* If css file does not exist:
*
* - creates the css file
* - optionally inserts initial styles
*
* If css file already exists:
*
* - does nothing
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* Many Looma operations depend on css file existing.
*
* Example:
*
* - "make header red"
* - "increase spacing"
* - "add hover effect"
* - "make card responsive"
*
* Before inserting styles,
* we must ensure style file exists.
*
* Useful in commands like:

make header red
add hover effect
increase spacing
make card responsive
add styles to navbar
create component
extract component

It is usually called before:

insertStyles
updateStyles
removeStyles
createComponent
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* Looma treats every component as:
*
* Component Unit
*
* Example:
*
* Header/
*   Header.jsx
*   Header.css
*   index.js
*
* This function enforces that convention.
*
* ------------------------------------------------------------
* PARAMS
* ------------------------------------------------------------
*
* @param {Object} params
*
* @param {string} params.componentPath
* Absolute or relative component folder path.
*
* Example:
*
* "./src/components/Header"
*
* @param {string} params.componentName
* Component name.
*
* Example:
*
* "Header"
*
* @param {string} [params.initialStyles]
* Optional initial css content.
*
* Example:
*
* ".header {}"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {Object}
*
* {
*   created: boolean,
*   cssPath: string
* }
*
*/
function ensureStyleFile(
  { componentName }: TaskPayload<"ensureStyleFile">,
  context: ExecutionContext,
): TaskResponse<TaskReturn<"ensureStyleFile">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute component directory path
  // ----------------------------------------------------------

  const { foundComponent }: any = finders.findComponentDirectory(
    {
      componentName,
    },
    context.appContext,
  );
  const absoluteComponentPath = foundComponent.componentPath;

  // ----------------------------------------------------------
  // STEP 2:
  // Build css file path
  //
  // Example:
  //
  // Header/Header.css
  // ----------------------------------------------------------

  const cssPath = path.join(absoluteComponentPath, `${componentName}.css`);

  // ----------------------------------------------------------
  // STEP 3:
  // Check if css file already exists
  // ----------------------------------------------------------

  const cssFileExists = fs.existsSync(cssPath);

  // ----------------------------------------------------------
  // STEP 4:
  // If css file already exists,
  // return early
  // ----------------------------------------------------------

  if (!cssFileExists) {
    return {
      success: false,
      cssPath,
    };
  }

  return {
    success: true,
    cssPath,
  };
}

/**
 * Validator: Normalizes a component into Looma's
 * canonical architecture format.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function repairs and standardizes:
 *
 * - component structure
 * - imports
 * - css imports
 * - component naming
 * - export structure
 * - directory consistency
 * - class naming
 * - formatting cleanup
 *
 * into a predictable architecture.
 *
 * Example:
 *
 * BEFORE:
 *
 * components/
 *   header.js
 *
 * AFTER:
 *
 * Header/
 *   Header.jsx
 *   Header.css
 *   index.js
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated code drifts rapidly.
 *
 * Over time projects become:
 *
 * - inconsistent
 * - structurally chaotic
 * - impossible to reason about
 * - difficult to edit automatically
 *
 * Runtime AI editing REQUIRES:
 *
 * deterministic structure.
 *
 * This function acts as:
 *
 * architecture stabilization layer.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER allow:
 *
 * arbitrary component structures.
 *
 * Every component should eventually
 * converge toward:
 *
 * ONE predictable structure.
 *
 * because:
 *
 * predictable architecture enables:
 *
 * - safe runtime editing
 * - reliable AST transforms
 * - undo/redo
 * - DOM synchronization
 * - registry synchronization
 * - scalable AI modifications
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation focuses on:
 *
 * filesystem normalization.
 *
 * It does NOT yet fully normalize:
 *
 * - hook ordering
 * - jsx formatting
 * - prop ordering
 * - state extraction
 * - logic separation
 * - advanced AST refactors
 *
 * Production version should eventually
 * become AST-driven.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - createComponent()
 * - updateComponent()
 * - renameComponent()
 * - moveComponent()
 * - extractComponent()
 * - ensureComponentStructure()
 * - updateComponentImports()
 * - resolveCssClassConflicts()
 * - syncComponentStyles()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "cleanup component"
 * - "normalize architecture"
 * - "repair generated code"
 * - "fix component structure"
 * - "optimize project"
 * - "prepare for extraction"
 * - "stabilize AI generated UI"
 *
 * Usually executed:
 *
 * AFTER major AI-generated changes.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentPath
 * Component directory path.
 *
 * Example:
 *
 * "./src/components/Header"
 *
 * @param {string} params.componentName
 * Canonical component name.
 *
 * Example:
 *
 * "Header"
 *
 * @param {boolean} [params.ensureCss=true]
 * Whether component should contain css file.
 *
 * @param {boolean} [params.ensureIndex=true]
 * Whether component should contain index.js.
 *
 * @param {boolean} [params.normalizeExports=true]
 * Whether export statements should be normalized.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   normalized: boolean,
 *   repairedItems: string[],
 *   warnings: string[]
 * }
 *
 */
function normalizeComponent(
  {
    componentPath,
    componentName,
    ensureCss = true,
    ensureIndex = true,
    normalizeExports = true,
  }: TaskPayload<"normalizeComponent">,
  context: ExecutionContext,
): TaskResponse<TaskReturn<"normalizeComponent">> {
  const COMPONENT_STRUCTURE = context.appContext.config.componentStructure;
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute component path
  // ----------------------------------------------------------

  const absoluteComponentPath = path.resolve(componentPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Validate component directory existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteComponentPath)) {
    throw new LoomaError(
      ERROR_CODES.TASK_EXECUTION_FAILED,
      `Component directory does not exist: ${absoluteComponentPath}`,
      {
        payload: {
          componentPath,
          componentName,
          ensureCss: true,
          ensureIndex: true,
          normalizeExports: true,
        },
      },
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Track repaired items
  // ----------------------------------------------------------

  const repairedItems = [];

  // ----------------------------------------------------------
  // STEP 4:
  // Track warnings
  // ----------------------------------------------------------

  const warnings = [];

  // ----------------------------------------------------------
  // STEP 5:
  // Ensure canonical component structure
  // ----------------------------------------------------------

  const jsxPath = path.join(
    absoluteComponentPath,
    `${componentName}${COMPONENT_STRUCTURE[0]}`,
  );

  const cssPath = path.join(
    absoluteComponentPath,
    `${componentName}${COMPONENT_STRUCTURE[1]}`,
  );

  const indexPath = path.join(absoluteComponentPath, COMPONENT_STRUCTURE[2]);

  // ----------------------------------------------------------
  // STEP 6:
  // Ensure JSX file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(jsxPath)) {
    // --------------------------------------------------------
    // Create minimal JSX template
    // --------------------------------------------------------

    const jsxTemplate = `
import "./${componentName}.css";

function ${componentName}() {
 return (
   <div className="${componentName.toLowerCase()}">
     ${componentName}
   </div>
 );
}

export default ${componentName};
`;

    fs.writeFileSync(jsxPath, jsxTemplate.trim(), "utf8");

    repairedItems.push("Created missing JSX file");
  }

  // ----------------------------------------------------------
  // STEP 7:
  // Ensure CSS file exists
  // ----------------------------------------------------------

  if (ensureCss && !fs.existsSync(cssPath)) {
    // --------------------------------------------------------
    // Create empty CSS file
    // --------------------------------------------------------

    fs.writeFileSync(cssPath, "", "utf8");

    repairedItems.push("Created missing CSS file");
  }

  // ----------------------------------------------------------
  // STEP 8:
  // Ensure index.js exists
  // ----------------------------------------------------------

  if (ensureIndex && !fs.existsSync(indexPath)) {
    // --------------------------------------------------------
    // Create standard export file
    // --------------------------------------------------------

    const indexTemplate = `
export { default } from "./${componentName}";
`;

    fs.writeFileSync(indexPath, indexTemplate.trim(), "utf8");

    repairedItems.push("Created missing index.js");
  }

  // ----------------------------------------------------------
  // STEP 9:
  // Read component source
  // ----------------------------------------------------------

  let componentCode = fs.readFileSync(jsxPath, "utf8");

  // ----------------------------------------------------------
  // STEP 10:
  // Ensure CSS import exists
  // ----------------------------------------------------------

  const cssImportStatement = `import "./${componentName}.css";`;

  // ----------------------------------------------------------
  // Add css import if missing
  // ----------------------------------------------------------

  if (ensureCss && !componentCode.includes(cssImportStatement)) {
    componentCode = cssImportStatement + "\n" + componentCode;

    repairedItems.push("Added missing CSS import");
  }

  // ----------------------------------------------------------
  // STEP 11:
  // Normalize export statement
  // ----------------------------------------------------------

  if (normalizeExports) {
    // --------------------------------------------------------
    // Remove broken exports
    // --------------------------------------------------------

    componentCode = componentCode.replace(
      /export\s+default\s+[A-Za-z0-9_]+;/g,
      "",
    );

    // --------------------------------------------------------
    // Add canonical export
    // --------------------------------------------------------

    componentCode += `

export default ${componentName};
`;

    repairedItems.push("Normalized export statement");
  }

  // ----------------------------------------------------------
  // STEP 12:
  // Normalize component declaration
  // ----------------------------------------------------------

  const componentDeclarationRegex = /function\s+[A-Za-z0-9_]+\s*\(/;

  // ----------------------------------------------------------
  // Replace incorrect component names
  // ----------------------------------------------------------

  if (componentDeclarationRegex.test(componentCode)) {
    componentCode = componentCode.replace(
      componentDeclarationRegex,
      `function ${componentName}(`,
    );

    repairedItems.push("Normalized component declaration");
  } else {
    warnings.push("No function component declaration found");
  }

  // ----------------------------------------------------------
  // STEP 13:
  // Cleanup excessive blank lines
  // ----------------------------------------------------------

  componentCode = componentCode.replace(/\n{3,}/g, "\n\n");

  // ----------------------------------------------------------
  // STEP 14:
  // Write normalized component source
  // ----------------------------------------------------------

  fs.writeFileSync(jsxPath, componentCode.trim(), "utf8");

  // ----------------------------------------------------------
  // STEP 15:
  // Return normalization summary
  // ----------------------------------------------------------

  return {
    success: repairedItems.length > 0,
    repairedItems,
    warnings,
  };
}

/**
 * Validator: Ensures that a component follows
 * Looma's required filesystem structure.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function validates and fixes:
 *
 * - component directory
 * - jsx file
 * - css file
 * - index.js file
 *
 * structure consistency.
 *
 * Example:
 *
 * REQUIRED STRUCTURE:
 *
 * Header/
 *   Header.jsx
 *   Header.css
 *   index.js
 *
 * If something is missing:
 *
 * - it gets created
 *
 * If structure is invalid:
 *
 * - it gets normalized
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated projects drift very quickly.
 *
 * Without strict structure enforcement:
 *
 * - imports become inconsistent
 * - components become fragmented
 * - css locations become unpredictable
 * - registry synchronization breaks
 * - runtime editing becomes unstable
 *
 * This function acts as:
 *
 * architecture enforcement layer.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER support:
 *
 * random project structures.
 *
 * Deterministic structure is REQUIRED for:
 *
 * - runtime editing
 * - component registry
 * - DOM mapping
 * - AI transformations
 * - undo/redo
 * - AST synchronization
 *
 * Structure consistency is one of the
 * MOST IMPORTANT foundations of Looma.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * handles filesystem structure only.
 *
 * It does NOT validate:
 *
 * - component correctness
 * - jsx correctness
 * - import correctness
 * - css correctness
 *
 * Those belong to separate validators.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - createComponent()
 * - updateComponent()
 * - renameComponent()
 * - moveComponent()
 * - extractComponent()
 * - ensureStyleFile()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "create component"
 * - "fix project structure"
 * - "normalize components"
 * - "extract reusable section"
 * - "repair generated code"
 * - "migrate project"
 * - "sync architecture"
 *
 * Usually executed:
 *
 * BEFORE major component mutations.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentPath
 * Component directory path.
 *
 * Example:
 *
 * "./src/components/Header"
 *
 * @param {string} params.componentName
 * Component name.
 *
 * Example:
 *
 * "Header"
 *
 * @param {boolean} [params.ensureCss=true]
 * Whether css file should exist.
 *
 * @param {boolean} [params.ensureIndex=true]
 * Whether index.js should exist.
 *
 * @param {boolean} [params.createIfMissing=true]
 * Whether missing directories/files
 * should be automatically created.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   created: string[],
 *   existing: string[],
 *   repaired: boolean
 * }
 *
 */
// function ensureComponentStructure({
//   componentPath,
//   componentName,
//   ensureCss = true,
//   ensureIndex = true,
//   createIfMissing = true,
// }: TaskPayload<"ensureComponentStructure">, context: ExecutionContext): TaskResponse<
//   TaskReturn<"ensureComponentStructure">
// > {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Resolve absolute component path
//   // ----------------------------------------------------------

//   const absoluteComponentPath = path.resolve(componentPath);

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Track created files/directories
//   // ----------------------------------------------------------

//   const created = [];

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Track existing files/directories
//   // ----------------------------------------------------------

//   const existing = [];

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Ensure component directory exists
//   // ----------------------------------------------------------

//   if (!fs.existsSync(absoluteComponentPath)) {
//     // --------------------------------------------------------
//     // Throw if auto creation disabled
//     // --------------------------------------------------------

//     if (!createIfMissing) {
//       throw new Error(
//         `Component directory does not exist: ${absoluteComponentPath}`
//       );
//     }

//     // --------------------------------------------------------
//     // Create component directory
//     // --------------------------------------------------------

//     fs.mkdirSync(absoluteComponentPath, {
//       recursive: true,
//     });

//     created.push(absoluteComponentPath);
//   } else {
//     existing.push(absoluteComponentPath);
//   }

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Build JSX file path
//   // ----------------------------------------------------------

//   const jsxPath = path.join(
//     absoluteComponentPath,
//     `${componentName}${CONSTENTS.COMPONENT_STRUCTURE[0]}`
//   );

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Ensure JSX file exists
//   // ----------------------------------------------------------

//   if (!fs.existsSync(jsxPath)) {
//     // --------------------------------------------------------
//     // Throw if creation disabled
//     // --------------------------------------------------------

//     if (!createIfMissing) {
//       throw new Error(`Component JSX file missing: ${jsxPath}`);
//     }

//     // --------------------------------------------------------
//     // Create minimal component template
//     // --------------------------------------------------------

//     const componentTemplate = `
// import "./${componentName}.css";

// function ${componentName}() {
//  return (
//    <div className="${componentName.toLowerCase()}">
//      ${componentName}
//    </div>
//  );
// }

// export default ${componentName};
// `;

//     fs.writeFileSync(jsxPath, componentTemplate.trim(), "utf8");

//     created.push(jsxPath);
//   } else {
//     existing.push(jsxPath);
//   }

//   // ----------------------------------------------------------
//   // STEP 7:
//   // Build CSS file path
//   // ----------------------------------------------------------

//   const cssPath = path.join(
//     absoluteComponentPath,
//     `${componentName}${CONSTENTS.COMPONENT_STRUCTURE[1]}`
//   );

//   // ----------------------------------------------------------
//   // STEP 8:
//   // Ensure CSS file exists
//   // ----------------------------------------------------------

//   if (ensureCss) {
//     if (!fs.existsSync(cssPath)) {
//       // ------------------------------------------------------
//       // Throw if creation disabled
//       // ------------------------------------------------------

//       if (!createIfMissing) {
//         throw new Error(`Component CSS file missing: ${cssPath}`);
//       }

//       // ------------------------------------------------------
//       // Create empty css file
//       // ------------------------------------------------------

//       fs.writeFileSync(cssPath, "", "utf8");

//       created.push(cssPath);
//     } else {
//       existing.push(cssPath);
//     }
//   }

//   // ----------------------------------------------------------
//   // STEP 9:
//   // Build index.js path
//   // ----------------------------------------------------------

//   const indexPath = path.join(
//     absoluteComponentPath,
//     CONSTENTS.COMPONENT_STRUCTURE[2]
//   );

//   // ----------------------------------------------------------
//   // STEP 10:
//   // Ensure index.js exists
//   // ----------------------------------------------------------

//   if (ensureIndex) {
//     if (!fs.existsSync(indexPath)) {
//       // ------------------------------------------------------
//       // Throw if creation disabled
//       // ------------------------------------------------------

//       if (!createIfMissing) {
//         throw new Error(`Component index.js missing: ${indexPath}`);
//       }

//       // ------------------------------------------------------
//       // Create export file
//       // ------------------------------------------------------

//       const indexTemplate = `
// export { default } from "./${componentName}";
// `;

//       fs.writeFileSync(indexPath, indexTemplate.trim(), "utf8");

//       created.push(indexPath);
//     } else {
//       existing.push(indexPath);
//     }
//   }

//   // ----------------------------------------------------------
//   // STEP 11:
//   // Return structure validation summary
//   // ----------------------------------------------------------

//   return {
//     success: true,
//     existing,
//     repaired: created.length > 0,
//   };
// }

export default {
  // insertCode,

  // expose only when planner becomes mature enough to use it directly
  // ensureImport,
  // removeImport,
  // enrichImport,
  // optimizeImports,
  // updateComponentImports,
  // findNodeByLine,
  // findComponentByName,
  // findJSXElement,

  // resolveImportConflicts,

  // do not expose
  ensureLibrary,

  // ensureComponentStructure,
  normalizeComponent,

  // findComponentDirectory,
  // inferComponentName,

  ensureStyleFile,
};
