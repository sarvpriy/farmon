/*

Helper tasks: Discovery, parsing,
normalization, analysis, and other utilities that support the main tasks.
------------
ensureLibrary
ensureImport
removeImport
enrichImport
optimizeImports
resolveImportConflicts
findComponentDirectory
findNodeByLine
findComponentByName
findJSXElement
ensureComponentStructure
updateComponentImports
normalizeComponent
inferComponentName
ensureStyleFile
renameCssClass
generateClassNames
syncComponentStyles
findCssSelector
resolveCssClassConflicts
resolveStyleDependencies

*/

import fs from "fs";
import path from "path";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import { generate } from "@babel/generator";
import t from "@babel/types";
import postcss from "postcss";

import sse from "../../server/sse.js";

import crypto from "crypto";
import { createSyncFn } from "synckit";

import { ERROR_CODES, TaskRegistry } from "../../schemas/index.js";
import type {
  ComponentRegistry,
  ProjectDependencies,
  TaskPayload,
  TaskReturn,
  TaskResponse,
} from "../../schemas/index.js";

import parsers from "./parsers.js";
import { LoomaError } from "../../server/error.js";
import { getInitializationContext } from "../../server/app-context.js";

// function informUser({ message }) {
//   sse.emitInfo(message);
// }

/**
 * Removes a library from package.json.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function removes a package from:
 *
 * - dependencies
 * OR
 * - devDependencies
 *
 * If the package does not exist:
 * - nothing changes
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * This function ONLY updates package.json.
 *
 * It DOES NOT:
 * - run npm uninstall
 * - remove node_modules
 * - remove imports from source files
 *
 * Those responsibilities should remain separate.
 *
 *
 * Useful commands:
 * - remove redux: removeLibrary("@reduxjs/toolkit")
 * - remove tailwind: removeLibrary("tailwindcss")
 * - remove charts: removeLibrary("recharts")
 * - remove icons package: removeLibrary("lucide-react")
 * - stop using router: removeLibrary("react-router-dom")
 *
 * ------------------------------------------------------------
 * WHY THIS SEPARATION IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Dependency management and source-code cleanup are different
 * architectural concerns.
 *
 * Example:
 *
 * removeLibrary()
 *   -> package.json mutation
 *
 * removeImport()
 *   -> source code mutation
 *
 * optimizeImports()
 *   -> dead import cleanup
 *
 * ------------------------------------------------------------
 * EXAMPLE
 * ------------------------------------------------------------
 *
 * removeLibrary({
 *   projectPath: "/my-app",
 *   libraryName: "lodash"
 * });
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.projectPath
 * Path to project root directory.
 *
 * @param {string} params.libraryName
 * Name of package to remove.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   modified: boolean,
 *   removedFrom: string|null,
 *   packageJson: Object
 * }}
 *
 * modified:
 * true  -> package removed
 * false -> package not found
 *
 * removedFrom:
 * "dependencies"
 * "devDependencies"
 * null
 *
 */
// function removeLibrary({ projectPath, libraryName }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Build package.json absolute path
//   // ----------------------------------------------------------

//   const packageJsonPath = path.join(projectPath, "package.json");

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Ensure package.json exists
//   // ----------------------------------------------------------

//   if (!fs.existsSync(packageJsonPath)) {
//     throw new Error(`package.json not found at: ${packageJsonPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Read package.json as text
//   // ----------------------------------------------------------

//   const packageJsonContent = fs.readFileSync(packageJsonPath, "utf-8");

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Convert JSON string into JS object
//   // ----------------------------------------------------------

//   const packageJson = JSON.parse(packageJsonContent);

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Track where library was removed from
//   // ----------------------------------------------------------

//   let removedFrom = null;

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Check dependencies
//   //
//   // Example:
//   //
//   // {
//   //   dependencies: {
//   //     react: "^19.0.0"
//   //   }
//   // }
//   // ----------------------------------------------------------

//   if (packageJson.dependencies && packageJson.dependencies[libraryName]) {
//     // --------------------------------------------------------
//     // Remove package
//     // --------------------------------------------------------

//     delete packageJson.dependencies[libraryName];

//     // --------------------------------------------------------
//     // Track removal source
//     // --------------------------------------------------------

//     removedFrom = "dependencies";
//   }

//   // ----------------------------------------------------------
//   // STEP 7:
//   // Check devDependencies
//   // ----------------------------------------------------------

//   if (packageJson.devDependencies && packageJson.devDependencies[libraryName]) {
//     // --------------------------------------------------------
//     // Remove package
//     // --------------------------------------------------------

//     delete packageJson.devDependencies[libraryName];

//     // --------------------------------------------------------
//     // Track removal source
//     // --------------------------------------------------------

//     removedFrom = "devDependencies";
//   }

//   // ----------------------------------------------------------
//   // STEP 8:
//   // If package was not found:
//   // return unchanged
//   // ----------------------------------------------------------

//   if (!removedFrom) {
//     return {
//       modified: false,
//       removedFrom: null,
//       packageJson,
//     };
//   }

//   // ----------------------------------------------------------
//   // STEP 9:
//   // Sort dependencies alphabetically
//   //
//   // WHY?
//   //
//   // Stable ordering:
//   // - cleaner git diffs
//   // - deterministic formatting
//   // ----------------------------------------------------------

//   if (packageJson.dependencies) {
//     packageJson.dependencies = Object.fromEntries(
//       Object.entries(packageJson.dependencies).sort(([a], [b]) =>
//         a.localeCompare(b)
//       )
//     );
//   }

//   // ----------------------------------------------------------
//   // STEP 10:
//   // Sort devDependencies alphabetically
//   // ----------------------------------------------------------

//   if (packageJson.devDependencies) {
//     packageJson.devDependencies = Object.fromEntries(
//       Object.entries(packageJson.devDependencies).sort(([a], [b]) =>
//         a.localeCompare(b)
//       )
//     );
//   }

//   // ----------------------------------------------------------
//   // STEP 11:
//   // Convert JS object back into formatted JSON string
//   // ----------------------------------------------------------

//   const updatedContent = JSON.stringify(packageJson, null, 2);

//   // ----------------------------------------------------------
//   // STEP 12:
//   // Write updated package.json back to disk
//   // ----------------------------------------------------------

//   fs.writeFileSync(packageJsonPath, `${updatedContent}\n`, "utf-8");

//   // ----------------------------------------------------------
//   // STEP 13:
//   // Return success metadata
//   // ----------------------------------------------------------

//   return {
//     modified: true,
//     removedFrom,
//     packageJson,
//   };
// }

/**
 * this function updates the version of a library in package.json. it looks for the library in all dependency sections and updates the version. if the library is not found, it throws an error.
 * @param pkgPath
 * @param param1
 */
// function updateLibraryVersion({ pkgPath, packageName, newVersion }) {
//   const pkgRaw = fs.readFileSync(pkgPath, "utf-8");
//   const pkg = JSON.parse(pkgRaw);

//   let updated = false;

//   const sections = [
//     "dependencies",
//     "devDependencies",
//     "peerDependencies",
//     "optionalDependencies",
//   ];
//   for (const section of sections) {
//     if (pkg[section] && pkg[section][packageName]) {
//       pkg[section][packageName] = newVersion;
//       updated = true;
//     }
//   }

//   if (!updated) {
//     throw new Error(`Package "${packageName}" not found in dependencies`);
//   }

//   fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
// }

/**
* Resolves import naming conflicts inside a file.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function detects conflicting import identifiers
* and automatically renames imports safely.
*
* Example:
*
* BEFORE:
*
* import Button from "./Button";
* import Button from "./UI/Button";
*
* AFTER:
*
* import Button from "./Button";
* import UIButton from "./UI/Button";
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered frontend systems,
* imports are often generated dynamically.
*
* Example:
*
* User says:
*
* "add button component"
*
* LLM may generate:
*
* import Button from "./Button";
*
* But:
*
* Button may already exist.
*
* This creates:
*
* duplicate identifier errors.
*
* ------------------------------------------------------------
* WHAT IS IMPORT CONFLICT?
* ------------------------------------------------------------
*
* Conflict occurs when:
*
* two imports introduce same variable name.
*
* Example:
*
* import Card from "./Card";
* import Card from "./UI/Card";
*
* Both define:
*
* Card
*
* in same scope.
*
* Useful in:
* - ensureImport
* - includeImport
* - optimizeImports
* - createComponent
* - insertJSX
* - mergeComponents
* - codeReplace
* parseAST
   ↓
resolveImportConflicts
   ↓
generateCode
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* resolveImportConflicts is:
*
* INTERNAL ONLY
*
* WHY?
*
* Users never directly ask:
*
* "resolve import conflicts"
*
* Instead:
*
* higher-level primitives internally use it.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION HANDLES
* ------------------------------------------------------------
*
* Current implementation handles:
*
* - duplicate default imports
* - duplicate named imports
* - duplicate namespace imports
*
* ------------------------------------------------------------
* CONFLICT RESOLUTION STRATEGY
* ------------------------------------------------------------
*
* If identifier already exists:
*
* generate unique alias.
*
* Example:
*
* Button
* Button1
* Button2
* Button3
*
* until unique identifier found.
*
* ------------------------------------------------------------
* IMPORTANT NOTE
* ------------------------------------------------------------
*
* This function updates:
*
* import declarations only.
*
* It does NOT automatically rename usages.
*
* WHY?
*
* Usage updates belong to:
*
* renameVariable
* or
* identifier refactor utilities.
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - only checks import declarations
*
* NOT:
*
* - local variables
* - function params
* - component names
*
* Future improvements:
*
* - scope-aware resolution
* - full identifier graph
* - automatic usage rewrites
* - TS type import support
*
* ------------------------------------------------------------
* PARAMS
* ------------------------------------------------------------
*
* @param {Object} params
*
* @param {object} params.ast
* Babel AST object.
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{
*   ast: object,
*   code: string
* }}
*
*/
// function resolveImportConflicts({
//   ast,
// }: TaskPayload<any>): TaskResponse<TaskReturn<any>> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Store already-used identifiers
//   //
//   // Example:
//   //
//   // Button
//   // Header
//   // React
//   // ----------------------------------------------------------

//   const usedIdentifiers = new Set();

//   // ----------------------------------------------------------
//   // STEP 2:
//   // .default all import declarations
//   // ----------------------------------------------------------

//   traverse.default(ast, {
//     ImportDeclaration(path) {
//       // ------------------------------------------------------
//       // Iterate all import specifiers
//       //
//       // Examples:
//       //
//       // import React from "react"
//       // import { useState } from "react"
//       // import * as UI from "./ui"
//       // ------------------------------------------------------

//       path.node.specifiers.forEach((specifier) => {
//         // --------------------------------------------------
//         // Extract local identifier name
//         //
//         // Example:
//         //
//         // import Button from "./Button"
//         //
//         // local.name = Button
//         // --------------------------------------------------

//         const localName = specifier.local.name;

//         // --------------------------------------------------
//         // If identifier not used yet:
//         // store it safely
//         // --------------------------------------------------

//         if (!usedIdentifiers.has(localName)) {
//           usedIdentifiers.add(localName);
//           return;
//         }

//         // --------------------------------------------------
//         // CONFLICT DETECTED
//         //
//         // Need unique replacement name.
//         // --------------------------------------------------

//         let counter = 1;

//         // --------------------------------------------------
//         // Start with:
//         //
//         // Button1
//         // --------------------------------------------------

//         let newName = `${localName}${counter}`;

//         // --------------------------------------------------
//         // Keep generating until unique name found
//         // --------------------------------------------------

//         while (usedIdentifiers.has(newName)) {
//           counter++;

//           newName = `${localName}${counter}`;
//         }

//         // --------------------------------------------------
//         // Mark new name as used
//         // --------------------------------------------------

//         usedIdentifiers.add(newName);

//         // --------------------------------------------------
//         // Replace conflicting identifier
//         //
//         // Example:
//         //
//         // Button -> Button1
//         // --------------------------------------------------

//         specifier.local = t.identifier(newName);
//       });
//     },
//   });

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Generate updated source code
//   // ----------------------------------------------------------

//   const output = generate(ast, {
//     retainLines: true,
//   });

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Return updated AST + code
//   // ----------------------------------------------------------

//   return {
//     ast,
//     code: output.code,
//   };
// }

/**
 *
 * Updates import statements inside a component file.
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function safely manages:
 *
 * - adding imports
 * - removing imports
 * - replacing imports
 * - fixing import paths
 * - deduplicating imports
 *
 * inside a component file.
 *
 * Example:
 *
 * BEFORE:
 *
 * import Button from "./Button";
 *
 * AFTER:
 *
 * import Button from "../ui/Button";
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated projects frequently suffer from:
 *
 * - duplicate imports
 * - broken relative paths
 * - stale imports
 * - missing imports
 * - inconsistent ordering
 *
 * Runtime component manipulation
 * becomes impossible without:
 *
 * deterministic import management.
 *
 * This function acts as:
 *
 * import synchronization layer.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER:
 *
 * blindly append imports.
 *
 * Imports should always remain:
 *
 * - normalized
 * - deduplicated
 * - deterministic
 * - architecture-safe
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * updateComponentImports only removes imports it does not update JSX
 *
 *
 * Current implementation:
 *
 * uses string-based parsing.
 *
 * Production version should use:
 *
 * Babel AST import manipulation.
 *
 * because regex/string parsing becomes fragile
 * for:
 *
 * - multiline imports
 * - namespace imports
 * - mixed imports
 * - comments
 * - dynamic imports
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
 * - ensureImport()
 * - enrichImports()
 * - removeImport()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "extract component"
 * - "move component"
 * - "rename component"
 * - "replace button"
 * - "add modal"
 * - "cleanup imports"
 * - "fix broken imports"
 *
 * Usually executed AFTER:
 *
 * - component mutations
 * - file movements
 * - JSX updates
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentPath
 * JSX component file path.
 *
 * Example:
 *
 * "./src/components/Home/Home.jsx"
 *
 * @param {Array<Object>} params.operations
 * Import operations.
 *
 * Example:
 *
 * [
 *   {
 *     type: "add",
 *     importName: "Button",
 *     importPath: "../ui/Button"
 *   }
 * ]
 *
 * Supported operation types:
 *
 * - add
 * - remove
 * - replace
 *
 * ------------------------------------------------------------
 * OPERATION STRUCTURE
 * ------------------------------------------------------------
 *
 * ADD:
 *
 * {
 *   type: "add",
 *   importName,
 *   importPath
 * }
 *
 * REMOVE:
 *
 * {
 *   type: "remove",
 *   importName
 * }
 *
 * REPLACE:
 *
 * {
 *   type: "replace",
 *   oldImportName,
 *   newImportName,
 *   newImportPath
 * }
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   updated: boolean,
 *   operationsApplied: number
 * }
 *
 */
// function updateComponentImports({
//   componentPath,
//   operations = [],
// }: TaskPayload<"updateComponentImports">): TaskResponse<
//   TaskReturn<"updateComponentImports">
// > {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Resolve absolute component path
//   // ----------------------------------------------------------

//   const absoluteComponentPath = path.resolve(componentPath);

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Validate component existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(absoluteComponentPath)) {
//     throw new Error(`Component file does not exist: ${absoluteComponentPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Read component source code
//   // ----------------------------------------------------------

//   let componentCode = fs.readFileSync(absoluteComponentPath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Track successful operations
//   // ----------------------------------------------------------

//   let operationsApplied = 0;

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Process each import operation
//   // ----------------------------------------------------------

//   operations.forEach((operation) => {
//     // ------------------------------------------------------
//     // ADD IMPORT
//     // ------------------------------------------------------

//     if (operation.type === "add") {
//       // ----------------------------------------------------
//       // Build import statement
//       // ----------------------------------------------------

//       const importStatement = `import ${operation.importName} from "${operation.importPath}";`;

//       // ----------------------------------------------------
//       // Prevent duplicate imports
//       // ----------------------------------------------------

//       if (componentCode.includes(importStatement)) {
//         return;
//       }

//       // ----------------------------------------------------
//       // Insert import at top of file
//       // ----------------------------------------------------

//       componentCode = importStatement + "\n" + componentCode;

//       operationsApplied++;
//     }

//     // ------------------------------------------------------
//     // REMOVE IMPORT
//     // ------------------------------------------------------
//     else if (operation.type === "remove") {
//       // ----------------------------------------------------
//       // Build regex for import removal
//       // ----------------------------------------------------

//       const importRegex = new RegExp(
//         `import\\s+${operation.importName}\\s+from\\s+["'][^"']+["'];?\\n?`,
//         "g"
//       );

//       // ----------------------------------------------------
//       // Detect whether import exists
//       // ----------------------------------------------------

//       const hasImport = importRegex.test(componentCode);

//       // ----------------------------------------------------
//       // Remove import
//       // ----------------------------------------------------

//       componentCode = componentCode.replace(importRegex, "");

//       // ----------------------------------------------------
//       // Track successful removal
//       // ----------------------------------------------------

//       if (hasImport) {
//         operationsApplied++;
//       }
//     }

//     // ------------------------------------------------------
//     // REPLACE IMPORT
//     // ------------------------------------------------------
//     else if (operation.type === "replace") {
//       // ----------------------------------------------------
//       // Build regex for old import
//       // ----------------------------------------------------

//       const oldImportRegex = new RegExp(
//         `import\\s+${operation.oldImportName}\\s+from\\s+["'][^"']+["'];?`,
//         "g"
//       );

//       // ----------------------------------------------------
//       // Build new import statement
//       // ----------------------------------------------------

//       const newImportStatement = `import ${operation.newImportName} from "${operation.newImportPath}";`;

//       // ----------------------------------------------------
//       // Detect old import existence
//       // ----------------------------------------------------

//       const hasImport = oldImportRegex.test(componentCode);

//       // ----------------------------------------------------
//       // Replace old import
//       // ----------------------------------------------------

//       componentCode = componentCode.replace(oldImportRegex, newImportStatement);

//       // ----------------------------------------------------
//       // Track successful replacement
//       // ----------------------------------------------------

//       if (hasImport) {
//         operationsApplied++;
//       }
//     }
//   });

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Cleanup excessive blank lines
//   // ----------------------------------------------------------

//   componentCode = componentCode.replace(/\n{3,}/g, "\n\n");

//   // ----------------------------------------------------------
//   // STEP 7:
//   // Write updated component source
//   // ----------------------------------------------------------

//   fs.writeFileSync(absoluteComponentPath, componentCode.trim(), "utf8");

//   // ----------------------------------------------------------
//   // STEP 8:
//   // Return operation summary
//   // ----------------------------------------------------------

//   return {
//     success: operationsApplied > 0,
//     operationsApplied,
//   };
// }

/**
 * Infers the most appropriate component name
 * from various inputs.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function intelligently derives
 * a React component name from:
 *
 * - user commands
 * - file paths
 * - JSX content
 * - DOM labels
 * - filenames
 * - directory names
 *
 * Example:
 *
 * INPUT:
 *
 * "make navbar red"
 *
 * OUTPUT:
 *
 * "Navbar"
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Users rarely speak using:
 *
 * exact filesystem names.
 *
 * Example:
 *
 * User says:
 *
 * "update hero section"
 *
 * but filesystem may contain:
 *
 * HeroSection/
 *
 * AI systems require:
 *
 * normalized deterministic names.
 *
 * This function acts as:
 *
 * semantic naming bridge.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER depend entirely on:
 *
 * exact naming matches.
 *
 * Natural language interaction requires:
 *
 * fuzzy semantic inference.
 *
 * because users naturally say:
 *
 * - navbar
 * - nav bar
 * - navigation
 * - top header
 *
 * while project may contain:
 *
 * NavigationBar
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation uses:
 *
 * heuristic inference.
 *
 * Production version should eventually use:
 *
 * - component registry
 * - semantic embeddings
 * - AST metadata
 * - runtime DOM context
 *
 * for better accuracy.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - findComponentDirectory()
 * - createComponent()
 * - renameComponent()
 * - normalizeComponent()
 * - extractComponent()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "make navbar sticky"
 * - "update hero"
 * - "extract footer"
 * - "move login form"
 * - "delete sidebar"
 * - "rename top section"
 *
 * Usually executed BEFORE:
 *
 * - component lookup
 * - component mutation
 * - DOM synchronization
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} [params.userInput]
 * Natural language user command.
 *
 * Example:
 *
 * "update navbar styles"
 *
 * @param {string} [params.filePath]
 * File or directory path.
 *
 * Example:
 *
 * "./src/components/Navbar/Navbar.jsx"
 *
 * @param {string} [params.jsxCode]
 * JSX source code.
 *
 * Example:
 *
 * function Navbar() {}
 *
 * @param {string[]} [params.stopWords]
 * Words to ignore during inference.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   componentName,
 *   inferredFrom
 * }
 *
 */
// function inferComponentName({
//   userInput = "",
//   filePath = "",
//   jsxCode = "",
//   stopWords = [
//     "make",
//     "update",
//     "delete",
//     "move",
//     "rename",
//     "extract",
//     "component",
//     "section",
//     "add",
//     "remove",
//     "create",
//     "change",
//     "modify",
//     "the",
//     "a",
//     "an",
//   ],
// }: TaskPayload<"inferComponentName">): TaskResponse<
//   TaskReturn<"inferComponentName">
// > {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Helper function to convert strings
//   // into PascalCase component names
//   //
//   // Example:
//   //
//   // "hero section"
//   // →
//   // "HeroSection"
//   // ----------------------------------------------------------

//   function toPascalCase(value) {
//     return value
//       .split(/[\s-_]+/)
//       .filter(Boolean)
//       .map((word) => {
//         return word.charAt(0).toUpperCase() + word.slice(1);
//       })
//       .join("");
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Try inferring from JSX code
//   //
//   // Highest confidence source.
//   // ----------------------------------------------------------

//   if (jsxCode) {
//     // --------------------------------------------------------
//     // Match:
//     //
//     // function Header()
//     // --------------------------------------------------------

//     const functionMatch = jsxCode.match(/function\s+([A-Z][A-Za-z0-9_]*)\s*\(/);

//     // --------------------------------------------------------
//     // Return detected component name
//     // --------------------------------------------------------

//     if (functionMatch) {
//       return {
//         componentName: functionMatch[1],

//         inferredFrom: "jsx-function",
//       };
//     }

//     // --------------------------------------------------------
//     // Match:
//     //
//     // const Header = () =>
//     // --------------------------------------------------------

//     const arrowMatch = jsxCode.match(/const\s+([A-Z][A-Za-z0-9_]*)\s*=\s*\(/);

//     // --------------------------------------------------------
//     // Return detected arrow component
//     // --------------------------------------------------------

//     if (arrowMatch) {
//       return {
//         success: true,
//         componentName: arrowMatch[1],

//         inferredFrom: "jsx-arrow-function",
//       };
//     }
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Try inferring from file path
//   // ----------------------------------------------------------

//   if (filePath) {
//     // --------------------------------------------------------
//     // Extract filename/folder name
//     // --------------------------------------------------------

//     const parsedPath = path.parse(filePath);

//     // --------------------------------------------------------
//     // Prefer directory name if available
//     // --------------------------------------------------------

//     const directoryName = path.basename(path.dirname(filePath));

//     // --------------------------------------------------------
//     // Use filename if meaningful
//     // --------------------------------------------------------

//     const candidateName = parsedPath.name || directoryName;

//     // --------------------------------------------------------
//     // Normalize component name
//     // --------------------------------------------------------

//     const normalizedName = toPascalCase(candidateName);

//     // --------------------------------------------------------
//     // Return inferred name
//     // --------------------------------------------------------

//     if (normalizedName) {
//       return {
//         success: true,
//         componentName: normalizedName,

//         inferredFrom: "file-path",
//       };
//     }
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Try inferring from user input
//   // ----------------------------------------------------------

//   if (userInput) {
//     // --------------------------------------------------------
//     // Normalize input
//     // --------------------------------------------------------

//     const normalizedInput = userInput
//       .toLowerCase()
//       .replace(/[^a-z0-9\s-_]/g, "");

//     // --------------------------------------------------------
//     // Split words
//     // --------------------------------------------------------

//     const words = normalizedInput.split(/\s+/);

//     // --------------------------------------------------------
//     // Remove stop words
//     // --------------------------------------------------------

//     const filteredWords = words.filter((word) => {
//       return word && !stopWords.includes(word);
//     });

//     // --------------------------------------------------------
//     // Convert to PascalCase
//     // --------------------------------------------------------

//     const inferredName = toPascalCase(filteredWords.join(" "));

//     // --------------------------------------------------------
//     // Return inferred component name
//     // --------------------------------------------------------

//     if (inferredName) {
//       return {
//         success: true,
//         componentName: inferredName,

//         inferredFrom: "user-input",
//       };
//     }
//   }

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Fallback component name
//   // ----------------------------------------------------------

//   return {
//     success: true,
//     componentName: "UnnamedComponent",

//     inferredFrom: "fallback",
//   };
// }

/**
 * Generates deterministic CSS class names
 * for Looma components.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function creates predictable,
 * collision-safe css class names.
 *
 * Example:
 *
 * INPUT:
 *
 * componentName: "Header"
 * elementName: "title"
 *
 * OUTPUT:
 *
 * "header__title"
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated code can quickly become messy
 * if class naming is inconsistent.
 *
 * Problems without naming strategy:
 *
 * - duplicate class names
 * - style leakage
 * - unreadable css
 * - impossible refactors
 * - component collisions
 *
 * This function enforces:
 *
 * deterministic naming architecture.
 *
 * ------------------------------------------------------------
 * ARCHITECTURE STRATEGY
 * ------------------------------------------------------------
 *
 * This implementation follows:
 *
 * BEM-inspired naming.
 *
 * Format:
 *
 * component__element--modifier
 *
 * Examples:
 *
 * header
 * header__title
 * header__button
 * header__button--active
 *
 * ------------------------------------------------------------
 * IMPORTANT DESIGN DECISION
 * ------------------------------------------------------------
 *
 * Class names are:
 *
 * - deterministic
 * - readable
 * - component scoped
 * - collision resistant
 *
 * We NEVER generate:
 *
 * random class names.
 *
 * Example of BAD naming:
 *
 * x12ab
 * card991
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "create card component"
 * - "add button"
 * - "generate styles"
 * - "extract section"
 * - "create navbar"
 * - "rename styles"
 * - "normalize css"
 *
 * This function is usually called before:
 *
 * - insertStyles()
 * - updateStyles()
 * - renameCssClass()
 * - createComponent()
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentName
 * Component name.
 *
 * Example:
 *
 * "Header"
 *
 * @param {string} [params.elementName]
 * Optional child element name.
 *
 * Example:
 *
 * "title"
 *
 * @param {string} [params.modifier]
 * Optional modifier name.
 *
 * Example:
 *
 * "active"
 *
 * @param {boolean} [params.useKebabCase=true]
 * Whether generated names should use kebab-case.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {string}
 *
 * Example outputs:
 *
 * "header"
 * "header__title"
 * "header__button--active"
 *
 */
// function generateClassNames({
//   componentName,
//   elementName,
//   modifier,
//   useKebabCase = true,
// }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Helper function to normalize names
//   //
//   // Converts:
//   //
//   // HeaderTitle
//   // →
//   // header-title
//   // ----------------------------------------------------------

//   function normalize(value) {
//     // --------------------------------------------------------
//     // Return empty string for invalid values
//     // --------------------------------------------------------

//     if (!value) {
//       return "";
//     }

//     // --------------------------------------------------------
//     // Convert camelCase/PascalCase to kebab-case
//     // --------------------------------------------------------

//     let normalized = value.replace(/([a-z])([A-Z])/g, "$1-$2");

//     // --------------------------------------------------------
//     // Replace spaces/underscores
//     // --------------------------------------------------------

//     normalized = normalized.replace(/[\s_]+/g, "-");

//     // --------------------------------------------------------
//     // Lowercase final result
//     // --------------------------------------------------------

//     normalized = normalized.toLowerCase();

//     // --------------------------------------------------------
//     // Return normalized value
//     // --------------------------------------------------------

//     return normalized;
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Normalize component name
//   // ----------------------------------------------------------

//   const normalizedComponentName = useKebabCase
//     ? normalize(componentName)
//     : componentName;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Start class name with component scope
//   //
//   // Example:
//   //
//   // header
//   // ----------------------------------------------------------

//   let className = normalizedComponentName;

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Add element segment
//   //
//   // Example:
//   //
//   // header__title
//   // ----------------------------------------------------------

//   if (elementName) {
//     const normalizedElementName = useKebabCase
//       ? normalize(elementName)
//       : elementName;

//     className += `__${normalizedElementName}`;
//   }

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Add modifier segment
//   //
//   // Example:
//   //
//   // header__title--active
//   // ----------------------------------------------------------

//   if (modifier) {
//     const normalizedModifier = useKebabCase ? normalize(modifier) : modifier;

//     className += `--${normalizedModifier}`;
//   }

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Return generated class name
//   // ----------------------------------------------------------

//   return { className };
// }

/**
 * Synchronizes JSX class usage
 * with component CSS styles.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function ensures that:
 *
 * - JSX classNames
 * - CSS selectors
 *
 * stay synchronized.
 *
 * It performs:
 *
 * 1. Detect class names used in JSX
 * 2. Detect class names defined in CSS
 * 3. Find missing CSS classes
 * 4. Auto-generate missing CSS blocks
 * 5. Find orphan CSS classes
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated UI code can easily create:
 *
 * - missing styles
 * - orphan selectors
 * - inconsistent naming
 * - broken class references
 *
 * Example:
 *
 * JSX:
 *
 * <button className="header__button" />
 *
 * CSS:
 *
 * // missing .header__button
 *
 * This causes:
 *
 * - unstyled UI
 * - inconsistent rendering
 * - architecture drift
 *
 * This function prevents that.
 *
 * ------------------------------------------------------------
 * IMPORTANT DESIGN DECISION
 * ------------------------------------------------------------
 *
 * This function focuses ONLY on:
 *
 * synchronization.
 *
 * It does NOT:
 *
 * - generate advanced styles
 * - optimize css
 * - merge selectors
 * - infer design systems
 *
 * It only ensures:
 *
 * JSX ↔ CSS consistency.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function assumes:
 *
 * - ensureStyleFile()
 * - insertStyles()
 * - updateStyles()
 * - removeStyles()
 * - renameCssClass()
 * - generateClassNames()
 *
 * already exist.
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "create navbar"
 * - "generate styles"
 * - "extract component"
 * - "cleanup component"
 * - "normalize css"
 * - "sync styles"
 * - "fix missing styles"
 *
 * Usually executed:
 *
 * AFTER JSX mutations.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation supports:
 *
 * - className="..."
 * - class="..."
 *
 * It does NOT fully support:
 *
 * - clsx()
 * - classnames()
 * - template literals
 * - dynamic class generation
 *
 * Those require AST-level JSX analysis.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentPath
 * JSX component file path.
 *
 * @param {string} params.cssPath
 * CSS file path.
 *
 * @param {boolean} [params.removeOrphanStyles=false]
 * Whether unused css selectors should be removed.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   missingClasses: string[],  // when className is present in JSX but missing in CSS
 *   orphanClasses: string[],  // when class is defined in CSS but not used in JSX
 *   insertedClasses: string[],  // when this function auto-generates missing CSS blocks
 *   removedClasses: string[]   // when this function removes orphan CSS blocks (if enabled)
 * }
 *
 */
// function syncComponentStyles({
//   componentPath,
//   cssPath,
//   removeOrphanStyles = false,
// }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Validate component file existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(componentPath)) {
//     throw new Error(`Component file does not exist: ${componentPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Validate css file existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(cssPath)) {
//     throw new Error(`CSS file does not exist: ${cssPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Read JSX/component source code
//   // ----------------------------------------------------------

//   const componentCode = fs.readFileSync(componentPath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Read CSS source code
//   // ----------------------------------------------------------

//   const cssCode = fs.readFileSync(cssPath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Extract class names from JSX
//   //
//   // Handles:
//   //
//   // className="..."
//   // class="..."
//   // ----------------------------------------------------------

//   const jsxClassRegex = /class(Name)?=["'`]([^"'`]+)["'`]/g;

//   // ----------------------------------------------------------
//   // Store unique JSX classes
//   // ----------------------------------------------------------

//   const jsxClasses = new Set();

//   // ----------------------------------------------------------
//   // Iterate JSX matches
//   // ----------------------------------------------------------

//   let jsxMatch;

//   while ((jsxMatch = jsxClassRegex.exec(componentCode)) !== null) {
//     // --------------------------------------------------------
//     // Extract full class string
//     //
//     // Example:
//     //
//     // "header button active"
//     // --------------------------------------------------------

//     const classString = jsxMatch[2];

//     // --------------------------------------------------------
//     // Split multiple classes
//     // --------------------------------------------------------

//     classString.split(/\s+/).forEach((className) => {
//       // ----------------------------------------------------
//       // Ignore empty values
//       // ----------------------------------------------------

//       if (!className.trim()) {
//         return;
//       }

//       jsxClasses.add(className.trim());
//     });
//   }

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Extract css selectors
//   //
//   // Example:
//   //
//   // .header__button
//   // ----------------------------------------------------------

//   const cssSelectorRegex = /\.([a-zA-Z0-9_-]+)/g;

//   // ----------------------------------------------------------
//   // Store unique CSS classes
//   // ----------------------------------------------------------

//   const cssClasses = new Set();

//   let cssMatch;

//   while ((cssMatch = cssSelectorRegex.exec(cssCode)) !== null) {
//     cssClasses.add(cssMatch[1]);
//   }

//   // ----------------------------------------------------------
//   // STEP 7:
//   // Detect missing classes
//   //
//   // Present in JSX
//   // Missing in CSS
//   // ----------------------------------------------------------

//   const missingClasses = [];

//   jsxClasses.forEach((className) => {
//     if (!cssClasses.has(className)) {
//       missingClasses.push(className);
//     }
//   });

//   // ----------------------------------------------------------
//   // STEP 8:
//   // Detect orphan classes
//   //
//   // Present in CSS
//   // Missing in JSX
//   // ----------------------------------------------------------

//   const orphanClasses = [];

//   cssClasses.forEach((className) => {
//     if (!jsxClasses.has(className)) {
//       orphanClasses.push(className);
//     }
//   });

//   // ----------------------------------------------------------
//   // STEP 9:
//   // Insert missing css blocks
//   // ----------------------------------------------------------

//   const insertedClasses = [];

//   if (missingClasses.length > 0) {
//     // --------------------------------------------------------
//     // Generate css blocks
//     // --------------------------------------------------------

//     const generatedStyles = missingClasses
//       .map(
//         (className) => `
// .${className} {

// }
// `
//       )
//       .join("\n");

//     // --------------------------------------------------------
//     // Append generated styles
//     // --------------------------------------------------------

//     fs.appendFileSync(cssPath, `\n\n${generatedStyles}`, "utf8");

//     insertedClasses.push(...missingClasses);
//   }

//   // ----------------------------------------------------------
//   // STEP 10:
//   // Remove orphan styles if enabled
//   // ----------------------------------------------------------

//   const removedClasses = [];

//   if (removeOrphanStyles && orphanClasses.length > 0) {
//     let updatedCssCode = cssCode;

//     orphanClasses.forEach((className) => {
//       // ----------------------------------------------------
//       // Match entire css block
//       // ----------------------------------------------------

//       const blockRegex = new RegExp(`\\.${className}\\s*\\{[\\s\\S]*?\\}`, "g");

//       // ----------------------------------------------------
//       // Remove css block
//       // ----------------------------------------------------

//       updatedCssCode = updatedCssCode.replace(blockRegex, "");

//       removedClasses.push(className);
//     });

//     // --------------------------------------------------------
//     // Cleanup excessive spacing
//     // --------------------------------------------------------

//     updatedCssCode = updatedCssCode.replace(/\n{3,}/g, "\n\n");

//     // --------------------------------------------------------
//     // Write cleaned css
//     // --------------------------------------------------------

//     fs.writeFileSync(cssPath, updatedCssCode.trim(), "utf8");
//   }

//   // ----------------------------------------------------------
//   // STEP 11:
//   // Return synchronization summary
//   // ----------------------------------------------------------

//   return {
//     missingClasses,

//     orphanClasses,

//     insertedClasses,

//     removedClasses,
//   };
// }

/**
 * Resolves CSS class naming conflicts
 * inside component CSS and JSX files.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function detects duplicate or conflicting
 * css class names and renames them safely.
 *
 * It synchronizes changes across:
 *
 * - CSS file
 * - JSX component file
 *
 * Example:
 *
 * BEFORE:
 *
 * Header.css
 *
 * .button {
 *   color: red;
 * }
 *
 * Card.css
 *
 * .button {
 *   color: blue;
 * }
 *
 * AFTER:
 *
 * Header.css
 *
 * .header__button {
 *   color: red;
 * }
 *
 * JSX:
 *
 * className="header__button"
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated code frequently creates:
 *
 * - generic class names
 * - duplicated selectors
 * - style leakage
 * - component collisions
 *
 * Example bad class names:
 *
 * .container
 * .wrapper
 * .button
 * .title
 *
 * At scale these become:
 *
 * architecture disasters.
 *
 * This function enforces:
 *
 * component-scoped CSS naming.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER trust
 * raw AI-generated class names.
 *
 * Every generated class should become:
 *
 * deterministic
 * scoped
 * collision-safe
 *
 * Example:
 *
 * card__button
 * header__title
 * modal__footer
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function assumes:
 *
 * - parseCSS()
 * - findCssSelector()
 * - renameCssClass()
 * - generateClassNames()
 * - updateStyles()
 *
 * already exist.
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "create component"
 * - "extract component"
 * - "cleanup css"
 * - "normalize styles"
 * - "fix css conflicts"
 * - "merge components"
 * - "generate UI"
 *
 * Usually executed AFTER:
 *
 * - component generation
 * - JSX insertion
 * - style generation
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation supports:
 *
 * - static class names
 * - basic selectors
 *
 * It does NOT fully support:
 *
 * - clsx()
 * - CSS modules
 * - Tailwind
 * - styled-components
 * - dynamic class generation
 *
 * Those require AST-level JSX analysis.
 *
 * ------------------------------------------------------------
 * REQUIRED PACKAGE
 * ------------------------------------------------------------
 *
 * npm install postcss
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentName
 * Component name.
 *
 * Example:
 *
 * "Header"
 *
 * @param {string} params.cssPath
 * CSS file path.
 *
 * @param {string} params.componentPath
 * JSX component file path.
 *
 * @param {string[]} [params.genericClassNames]
 * Generic class names considered unsafe.
 *
 * Example:
 *
 * [
 *   "button",
 *   "container",
 *   "wrapper"
 * ]
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   renamedClasses: [
 *     {
 *       oldName,
 *       newName
 *     }
 *   ]
 * }
 *
 */
// function resolveCssClassConflicts({
//   componentName,
//   cssPath,
//   componentPath,
//   genericClassNames = [
//     "container",
//     "wrapper",
//     "button",
//     "title",
//     "card",
//     "box",
//     "text",
//     "item",
//     "content",
//   ],
// }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Validate CSS file existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(cssPath)) {
//     throw new Error(`CSS file does not exist: ${cssPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Validate component file existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(componentPath)) {
//     throw new Error(`Component file does not exist: ${componentPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Read CSS source code
//   // ----------------------------------------------------------

//   const cssCode = fs.readFileSync(cssPath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Parse CSS into AST
//   // ----------------------------------------------------------

//   const ast = postcss.parse(cssCode);

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Store renamed classes
//   // ----------------------------------------------------------

//   const renamedClasses = [];

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Track already processed classes
//   //
//   // Prevent duplicate renaming.
//   // ----------------------------------------------------------

//   const processedClasses = new Set();

//   // ----------------------------------------------------------
//   // STEP 7:
//   // Traverse all CSS rules
//   // ----------------------------------------------------------

//   ast.walkRules((rule) => {
//     // --------------------------------------------------------
//     // Extract selector
//     //
//     // Example:
//     //
//     // ".button"
//     // --------------------------------------------------------

//     const selector = rule.selector;

//     // --------------------------------------------------------
//     // Extract class name
//     //
//     // Example:
//     //
//     // button
//     // --------------------------------------------------------

//     const classMatch = selector.match(/\.([a-zA-Z0-9_-]+)/);

//     // --------------------------------------------------------
//     // Skip selectors without class
//     // --------------------------------------------------------

//     if (!classMatch) {
//       return;
//     }

//     // --------------------------------------------------------
//     // Extract class name
//     // --------------------------------------------------------

//     const oldClassName = classMatch[1];

//     // --------------------------------------------------------
//     // Skip already processed classes
//     // --------------------------------------------------------

//     if (processedClasses.has(oldClassName)) {
//       return;
//     }

//     // --------------------------------------------------------
//     // Mark class as processed
//     // --------------------------------------------------------

//     processedClasses.add(oldClassName);

//     // --------------------------------------------------------
//     // Check whether class is generic
//     // --------------------------------------------------------

//     const isGeneric = genericClassNames.includes(oldClassName);

//     // --------------------------------------------------------
//     // Skip safe classes
//     // --------------------------------------------------------

//     if (!isGeneric) {
//       return;
//     }

//     // --------------------------------------------------------
//     // Generate deterministic scoped class
//     //
//     // Example:
//     //
//     // button
//     // →
//     // header__button
//     // --------------------------------------------------------

//     const newClassName = `${componentName.toLowerCase()}__${oldClassName}`;

//     // --------------------------------------------------------
//     // Rename class in CSS
//     // --------------------------------------------------------

//     const updatedSelector = selector.replace(
//       `.${oldClassName}`,
//       `.${newClassName}`
//     );

//     rule.selector = updatedSelector;

//     // --------------------------------------------------------
//     // Rename class in JSX/component file
//     // --------------------------------------------------------

//     const componentCode = fs.readFileSync(componentPath, "utf8");

//     // --------------------------------------------------------
//     // Replace JSX class usage
//     // --------------------------------------------------------

//     const updatedComponentCode = componentCode.replace(
//       new RegExp(`\\b${oldClassName}\\b`, "g"),
//       newClassName
//     );

//     // --------------------------------------------------------
//     // Write updated JSX/component file
//     // --------------------------------------------------------

//     fs.writeFileSync(componentPath, updatedComponentCode, "utf8");

//     // --------------------------------------------------------
//     // Store rename result
//     // --------------------------------------------------------

//     renamedClasses.push({
//       oldName: oldClassName,
//       newName: newClassName,
//     });
//   });

//   // ----------------------------------------------------------
//   // STEP 8:
//   // Write updated CSS back to file
//   // ----------------------------------------------------------

//   fs.writeFileSync(cssPath, ast.toString(), "utf8");

//   // ----------------------------------------------------------
//   // STEP 9:
//   // Return rename summary
//   // ----------------------------------------------------------

//   return {
//     renamedClasses,
//   };
// }

/**
 * Resolves style dependencies used by a component.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function analyzes:
 *
 * - CSS imports
 * - font imports
 * - variable usage
 * - animation usage
 * - media query dependencies
 * - shared utility styles
 * - root CSS variables
 *
 * and ensures required style dependencies
 * are properly connected.
 *
 * Example:
 *
 * BEFORE:
 *
 * Button.css
 *
 * .button {
 *   color: var(--primary-color);
 * }
 *
 * But:
 *
 * variables.css is NOT imported.
 *
 * AFTER:
 *
 * variables.css gets imported automatically.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI-generated CSS often creates:
 *
 * - missing variables
 * - broken animations
 * - undefined fonts
 * - disconnected utility classes
 * - missing shared styles
 *
 * which causes:
 *
 * broken runtime UI.
 *
 * This function acts as:
 *
 * style dependency synchronization layer.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER allow:
 *
 * orphaned style references.
 *
 * Every style dependency should be:
 *
 * - traceable
 * - deterministic
 * - auto-repairable
 *
 * because runtime editing requires:
 *
 * predictable styling architecture.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation supports:
 *
 * - CSS variable detection
 * - @import detection
 * - animation detection
 *
 * Production version should later support:
 *
 * - Tailwind dependency graphs
 * - CSS modules
 * - CSS-in-JS
 * - design token systems
 * - theme inheritance
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - parseCSS()
 * - findCssSelector()
 * - ensureStyleFile()
 * - insertStyles()
 * - updateStyles()
 * - removeStyles()
 * - renameCssClass()
 * - resolveCssClassConflicts()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "create component"
 * - "generate styles"
 * - "extract component"
 * - "move component"
 * - "repair styling"
 * - "fix css variables"
 * - "cleanup styles"
 *
 * Usually executed AFTER:
 *
 * - style generation
 * - css insertion
 * - component extraction
 *
 * ------------------------------------------------------------
 * REQUIRED PACKAGE
 * ------------------------------------------------------------
 *
 * npm install postcss
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.cssPath
 * Component css file path.
 *
 * Example:
 *
 * "./src/components/Button/Button.css"
 *
 * @param {string[]} [params.availableDependencyFiles]
 * List of available shared style files.
 *
 * Example:
 *
 * [
 *   "./src/styles/variables.css",
 *   "./src/styles/animations.css"
 * ]
 *
 * @param {boolean} [params.autoImport=true]
 * Whether missing dependencies should
 * be imported automatically.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   resolvedDependencies: string[],
 *   missingDependencies: string[],
 *   insertedImports: string[]
 * }
 *
 */
function resolveStyleDependencies({
  cssPath,
  availableDependencyFiles = [],
  autoImport = true,
}: TaskPayload<"resolveStyleDependencies">): TaskResponse<
  TaskReturn<"resolveStyleDependencies">
> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute css path
  // ----------------------------------------------------------

  const absoluteCssPath = path.resolve(cssPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Validate css file existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteCssPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `CSS file does not exist: ${absoluteCssPath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read css source code
  // ----------------------------------------------------------

  let cssCode = fs.readFileSync(absoluteCssPath, "utf8");

  // ----------------------------------------------------------
  // STEP 4:
  // Parse CSS into AST
  // ----------------------------------------------------------

  const ast = postcss.parse(cssCode);

  // ----------------------------------------------------------
  // STEP 5:
  // Track dependencies
  // ----------------------------------------------------------

  const resolvedDependencies = [];

  const missingDependencies = [];

  const insertedImports = [];

  // ----------------------------------------------------------
  // STEP 6:
  // Detect CSS variable usage
  //
  // Example:
  //
  // var(--primary-color)
  // ----------------------------------------------------------

  const variableMatches = cssCode.match(/var\(--([a-zA-Z0-9-_]+)\)/g) || [];

  // ----------------------------------------------------------
  // STEP 7:
  // If variables are used,
  // ensure variables.css exists
  // ----------------------------------------------------------

  if (variableMatches.length > 0) {
    // --------------------------------------------------------
    // Try finding variables.css
    // --------------------------------------------------------

    const variablesFile = (availableDependencyFiles as string[]).find(
      (file) => {
        return file.includes("variables.css");
      }
    );

    // --------------------------------------------------------
    // If found, resolve dependency
    // --------------------------------------------------------

    if (variablesFile) {
      resolvedDependencies.push(variablesFile);

      // ------------------------------------------------------
      // Auto import variables.css
      // ------------------------------------------------------

      if (autoImport && !cssCode.includes(variablesFile)) {
        // ----------------------------------------------------
        // Build relative import path
        // ----------------------------------------------------

        const relativeImportPath = path.relative(
          path.dirname(absoluteCssPath),
          variablesFile
        );

        // ----------------------------------------------------
        // Normalize slashes
        // ----------------------------------------------------

        const normalizedImportPath = relativeImportPath.replace(/\\/g, "/");

        // ----------------------------------------------------
        // Build import statement
        // ----------------------------------------------------

        const importStatement = `@import "${normalizedImportPath}";\n`;

        // ----------------------------------------------------
        // Insert import at top
        // ----------------------------------------------------

        cssCode = importStatement + cssCode;

        insertedImports.push(normalizedImportPath);
      }
    }

    // --------------------------------------------------------
    // Track missing dependency
    // --------------------------------------------------------
    else {
      missingDependencies.push("variables.css");
    }
  }

  // ----------------------------------------------------------
  // STEP 8:
  // Detect animation usage
  //
  // Example:
  //
  // animation: fadeIn
  // ----------------------------------------------------------

  const animationMatches =
    cssCode.match(/animation\s*:\s*([a-zA-Z0-9_-]+)/g) || [];

  // ----------------------------------------------------------
  // STEP 9:
  // Resolve animations.css dependency
  // ----------------------------------------------------------

  if (animationMatches.length > 0) {
    // --------------------------------------------------------
    // Find animations.css
    // --------------------------------------------------------

    const animationsFile = (availableDependencyFiles as string[]).find(
      (file) => {
        return file.includes("animations.css");
      }
    );

    // --------------------------------------------------------
    // If found, resolve dependency
    // --------------------------------------------------------

    if (animationsFile) {
      resolvedDependencies.push(animationsFile);

      // ------------------------------------------------------
      // Auto import if enabled
      // ------------------------------------------------------

      if (autoImport && !cssCode.includes(animationsFile)) {
        // ----------------------------------------------------
        // Build relative path
        // ----------------------------------------------------

        const relativeImportPath = path.relative(
          path.dirname(absoluteCssPath),
          animationsFile
        );

        // ----------------------------------------------------
        // Normalize path separators
        // ----------------------------------------------------

        const normalizedImportPath = relativeImportPath.replace(/\\/g, "/");

        // ----------------------------------------------------
        // Build import statement
        // ----------------------------------------------------

        const importStatement = `@import "${normalizedImportPath}";\n`;

        // ----------------------------------------------------
        // Insert import
        // ----------------------------------------------------

        cssCode = importStatement + cssCode;

        insertedImports.push(normalizedImportPath);
      }
    }

    // --------------------------------------------------------
    // Track missing dependency
    // --------------------------------------------------------
    else {
      missingDependencies.push("animations.css");
    }
  }

  // ----------------------------------------------------------
  // STEP 10:
  // Detect existing @imports
  // ----------------------------------------------------------

  ast.walkAtRules("import", (rule) => {
    // ------------------------------------------------------
    // Extract imported file
    // ------------------------------------------------------

    const importMatch = rule.params.match(/["'](.+?)["']/);

    // ------------------------------------------------------
    // Skip invalid imports
    // ------------------------------------------------------

    if (!importMatch) {
      return;
    }

    // ------------------------------------------------------
    // Extract import path
    // ------------------------------------------------------

    const importPath = importMatch[1];

    // ------------------------------------------------------
    // Register dependency
    // ------------------------------------------------------

    resolvedDependencies.push(importPath);
  });

  // ----------------------------------------------------------
  // STEP 11:
  // Remove duplicate dependencies
  // ----------------------------------------------------------

  const uniqueResolvedDependencies = [...new Set(resolvedDependencies)];

  const uniqueInsertedImports = [...new Set(insertedImports)];

  const uniqueMissingDependencies = [...new Set(missingDependencies)];

  // ----------------------------------------------------------
  // STEP 12:
  // Write updated css back to file
  // ----------------------------------------------------------

  fs.writeFileSync(absoluteCssPath, cssCode, "utf8");

  // ----------------------------------------------------------
  // STEP 13:
  // Return dependency resolution summary
  // ----------------------------------------------------------

  return {
    success: true,
    resolvedDependencies: uniqueResolvedDependencies,

    missingDependencies: uniqueMissingDependencies,

    insertedImports: uniqueInsertedImports,
  };
}

/**
 * Inserts generic code into a file.
 *
 * Useful for:
 * - inserting hooks
 * - inserting utilities
 * - inserting exports
 * - inserting config
 * - inserting arbitrary JS/TS code
 */
// function insertCode({ filePath, codeToInsert, insertAt = "end" }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Ensure file exists
//   // ----------------------------------------------------------

//   if (!fs.existsSync(filePath)) {
//     throw new Error(`File does not exist: ${filePath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Read existing file content
//   // ----------------------------------------------------------

//   const existingCode = fs.readFileSync(filePath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Decide insertion strategy
//   // ----------------------------------------------------------

//   let updatedCode = existingCode;

//   // ----------------------------------------------------------
//   // Insert at beginning
//   // ----------------------------------------------------------

//   if (insertAt === "start") {
//     updatedCode = `${codeToInsert}\n\n${existingCode}`;
//   }

//   // ----------------------------------------------------------
//   // Insert at end
//   // ----------------------------------------------------------
//   else if (insertAt === "end") {
//     updatedCode = `${existingCode}\n\n${codeToInsert}`;
//   }

//   // ----------------------------------------------------------
//   // Unsupported insertion strategy
//   // ----------------------------------------------------------
//   else {
//     throw new Error(`Unsupported insertAt value: ${insertAt}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Write updated code back to file
//   // ----------------------------------------------------------

//   fs.writeFileSync(filePath, updatedCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return result
//   // ----------------------------------------------------------

//   return {
//     inserted: true,

//     filePath,

//     insertAt,
//   };
// }

/**
 * Generates source code from Babel AST.
 */
function generateCodeFromAST({ ast, options = {} }) {
  return generate(ast, {
    retainLines: false,
    compact: false,
    concise: false,
    comments: true,
    jsescOption: {
      minimal: true,
    },
    ...options,
  }).code;
}

function matchesSelector({ openingElement, selector }) {
  // ----------------------------------------------------------
  // Ignore unsupported JSX names
  // ----------------------------------------------------------

  if (!t.isJSXIdentifier(openingElement.name)) {
    return false;
  }

  const { tagName, classes, attributes } = parsers.parseSelector(selector);

  // ----------------------------------------------------------
  // Match tag
  // ----------------------------------------------------------

  if (openingElement.name.name !== tagName) {
    return false;
  }

  // ----------------------------------------------------------
  // Build attribute map
  // ----------------------------------------------------------

  const attributeMap: any = {};

  openingElement.attributes.forEach((attr) => {
    if (!t.isJSXAttribute(attr) || !t.isJSXIdentifier(attr.name)) {
      return;
    }

    // ------------------------------------------------------
    // String literal:
    //
    // href="#"
    // ------------------------------------------------------

    if (t.isStringLiteral(attr.value)) {
      attributeMap[attr.name.name] = attr.value.value;
    }

    // ------------------------------------------------------
    // JSX expression with string literal:
    //
    // src={"/logo.png"}
    // ------------------------------------------------------
    else if (
      t.isJSXExpressionContainer(attr.value) &&
      t.isStringLiteral(attr.value.expression)
    ) {
      attributeMap[attr.name.name] = attr.value.expression.value;
    }
  });

  // ----------------------------------------------------------
  // Match class names
  // ----------------------------------------------------------

  if (classes.length > 0) {
    const classNames = (attributeMap.className || "")
      .split(/\s+/)
      .filter(Boolean);

    const hasAllClasses = classes.every((className) =>
      classNames.includes(className)
    );

    if (!hasAllClasses) {
      return false;
    }
  }

  // ----------------------------------------------------------
  // Match attributes
  // ----------------------------------------------------------

  for (const [key, value] of Object.entries(attributes)) {
    if (attributeMap[key] !== value) {
      return false;
    }
  }

  return true;
}

function analyzeComponent() {}

// Architecture I Would Prefer

// Parsers
// parseAST
// parseCSS
// parseJSCode
// generateCodeFromAST

// Finders
// findNodeByLine
// findComponentByName
// findJSXElement
// findImportDeclaration
// findCssSelector
// findComponentDirectory

// Ensurers
// ensureLibrary
// ensureStyleFile
// ensureComponentStructure
// normalizeComponent

// Import Helpers
// buildImportDeclaration
// getImportSpecifiers
// removeImportSpecifier
// mergeImportDeclarations
// isImportUsed

// Analyzers (instead of many parseX functions)
// analyzeComponent
// analyzeDependencies
// analyzeTypes
// analyzeHooks
// analyzeExports

// const mutationTasks = getExportedFunctionNames("./lib/tasks/mutations.ts");
// const astTasks = getExportedFunctionNames("./lib/tasks/ast.ts");

/**
 * Parses a file and returns an array of exported function names.
 * @param {string} filePath - Path to the index.ts file.
 * @returns {string[]} Array of function name strings.
 */
async function getExportedFunctionNames(type) {
  let taskModule;
  if (type === "ast") {
    taskModule = await import("../tasks/ast.js");
  }

  if (type === "mutation") {
    taskModule = await import("../tasks/mutations.js");
  }

  if (type === "generators") {
    taskModule = await import("../tasks/generators.js");
  }

  if (type === "query") {
    taskModule = await import("../tasks/query.js");
  }
  let tasksList = Object.keys(taskModule.default);
  return tasksList;
}

/**
 *
 * @returns
 */
async function generateTasksDocs() {
  // let astTasksList = await getExportedFunctionNames("ast");
  // // const astModule = await import("../lib/tasks/ast.ts");
  // // let astTasksList = Object.keys(astModule.default);
  // let astTasks = [];

  let mutationTasksList = await getExportedFunctionNames("mutation");
  // const mutationsModule = await import("../lib/tasks/mutations.ts");
  // let mutationTasksList = Object.keys(mutationsModule.default);
  let mutationTasks = [];

  let generatorTasksList = await getExportedFunctionNames("generators");
  // const generatorModule = await import("../lib/tasks/generators.ts");
  // let generatorTasksList = Object.keys(generatorModule.default);
  let generatorTasks = [];

  let queryTasksList = await getExportedFunctionNames("query");
  // const queryModule = await import("../lib/tasks/query.ts");
  // let queryTasksList = Object.keys(queryModule.default);
  let queryTasks = [];

  for (let [taskName, task] of Object.entries(TaskRegistry)) {
    const payloadFields =
      "shape" in task.payload ? Object.keys(task.payload.shape) : [];
    const returnFields =
      "shape" in task.return ? Object.keys(task.return.shape) : [];

    const payloadString =
      payloadFields.length > 0 ? payloadFields.join(",\n  ") : "";

    const returnString =
      returnFields.length > 0 ? returnFields.join(",\n  ") : "";

    const taskDesc = `${taskName}({
  ${payloadString}
}) returns {
  ${returnString}
} - ${"description" in task ? task.description : "No description available"}`;

    // if (astTasksList.includes(taskName)) astTasks.push(taskDesc);
    if (mutationTasksList.includes(taskName)) mutationTasks.push(taskDesc);
    if (generatorTasksList.includes(taskName)) generatorTasks.push(taskDesc);
    if (queryTasksList.includes(taskName)) queryTasks.push(taskDesc);
  }

  return {
    // astTasks: astTasks.join("\n\n"),
    mutationTasks: mutationTasks.join("\n\n"),
    generatorTasks: generatorTasks.join("\n\n"),
    queryTasks: queryTasks.join("\n\n"),
  };
}

// Point synckit to your worker file
// const formatSync = createSyncFn(
//   path.join(getInitializationContext().workersDir, "prettier.js"),
// );

// const formatCodeSync = createSyncFn(paths.worker("prettier"));

function formatCode(code: string) {
  try {
    return createSyncFn(
      path.join(getInitializationContext().workersDir, "prettier.js")
    )(code);
  } catch (error) {
    throw new LoomaError(
      ERROR_CODES.VALIDATION_FAILED,
      `Syntax validation failed:\n${error.message}`
    );
  }
}

function formatObjectCode(obj) {
  const result = { ...obj };

  const keysToFormat = ["code", "css", "component"];

  for (const key of keysToFormat) {
    if (typeof result[key] === "string") {
      result[key] = formatCode(result[key]);
    }
  }

  return result;
}

/**
 * Resolves all task references inside a payload.
 *
 * Example:
 *
 * payload:
 * {
 *   code: {
 *     $ref: {
 *       source: "task_1",
 *       path: "generatedCode"
 *     }
 *   }
 * }
 *
 * taskOutputs:
 * {
 *   task_1: {
 *     generatedCode: "<div>Hello</div>"
 *   }
 * }
 *
 * result:
 * {
 *   code: "<div>Hello</div>"
 * }
 */
function resolveTaskReferences({
  value,
  taskOutputs,
}: {
  value: any;
  taskOutputs: object;
}) {
  // ----------------------------------------------------------
  // STEP 1:
  // Handle arrays.
  //
  // If the current value is an array,
  // recursively resolve every item.
  // ----------------------------------------------------------

  if (Array.isArray(value)) {
    return value.map((item) =>
      resolveTaskReferences({ value: item, taskOutputs })
    );
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Handle objects.
  //
  // Objects can either be:
  //
  // 1. A reference object
  // 2. A normal object containing nested references
  // ----------------------------------------------------------

  if (value && typeof value === "object") {
    // --------------------------------------------------------
    // STEP 3:
    // Check if this object is a reference.
    //
    // Example:
    //
    // {
    //   $ref: {
    //     source: "task_1",
    //     path: "generatedCode"
    //   }
    // }
    // --------------------------------------------------------

    if ("$ref" in value && value.$ref?.source) {
      const { source, path } = value.$ref;

      // ------------------------------------------------------
      // STEP 4:
      // Find task output.
      // ------------------------------------------------------

      const taskOutput = taskOutputs[source];

      if (!taskOutput) {
        throw new LoomaError(
          ERROR_CODES.TASK_ERROR,
          `Task output not found: ${source}`,
          {
            taskOutputs,
            source,
          }
        );
      }

      // ------------------------------------------------------
      // STEP 5:
      // Resolve nested path.
      //
      // Example:
      //
      // path:
      // "generatedCode"
      //
      // path:
      // "component.jsx"
      // ------------------------------------------------------

      const pathParts = path.split(".");

      let currentValue = taskOutput;

      for (const part of pathParts) {
        if (currentValue == null || !(part in currentValue)) {
          throw new LoomaError(
            ERROR_CODES.TASK_ERROR,
            `Unable to resolve path "${path}" from task "${source}"`,
            {
              task: resolveTaskReferences.name,
            }
          );
        }

        currentValue = currentValue[part];
      }

      // ------------------------------------------------------
      // STEP 6:
      // Return resolved value.
      // ------------------------------------------------------

      return currentValue;
    }

    // --------------------------------------------------------
    // STEP 7:
    // Resolve every property of a normal object.
    // --------------------------------------------------------

    return Object.fromEntries(
      Object.entries(value).map(([key, val]) => [
        key,
        resolveTaskReferences({ value: val, taskOutputs }),
      ])
    );
  }

  // ----------------------------------------------------------
  // STEP 8:
  // Primitive values need no processing.
  //
  // Examples:
  // string
  // number
  // boolean
  // null
  // undefined
  // ----------------------------------------------------------

  return value;
}

// function detectFileType(filename) {
//   const ext = path.extname(filename);
//   if (ext === ".jsx" || ext === ".tsx") return "jsx";
//   if (ext === ".js" || ext === ".ts") return "js";
//   if (ext === ".css") return "css";
//   if (ext === ".svg") return "svg";
//   if (filename === "package.json") return "json";
//   return "file";
// }

// const projectDir = path.resolve("../../");
// const map = generateMap(projectDir);
// fs.writeFileSync("../file-map.json", JSON.stringify(map, null, 2));
// console.log("Generated file-map.json");

// const SRC_DIR = path.join(__dirname, 'looma-test', 'src'); // where your frontend code lives
// console.log(__dirname)
// console.log(SRC_DIR)
// console.log(SRC_DIR)

// function readDirectoryStructure(dir, prefix = "") {
//   let structure = "";
//   const items = fs.readdirSync(dir);
//   for (const item of items) {
//     const fullPath = path.join(dir, item);
//     const relativePath = path.join(prefix, item);
//     const stat = fs.statSync(fullPath);
//     if (stat.isDirectory()) {
//       structure += `Directory: ${relativePath}\n`;
//       structure += readDirectoryStructure(fullPath, relativePath);
//     } else {
//       structure += `File: ${relativePath}\n`;
//     }
//   }
//   return structure;
// }

// function getFileTree(dir, depth = 0) {
//   let result = "";
//   const items = fs.readdirSync(dir);
//   for (const item of items) {
//     const path = `${dir}/${item}`;
//     const stats = fs.statSync(path);
//     result += "  ".repeat(depth) + item + "\n";
//     if (stats.isDirectory()) result += getFileTree(path, depth + 1);
//   }
//   return result;
// }

// console.log(readDirectoryStructure(PROJECT_SRC))
//save it to a local text file

// function generatePrompt({ command, component }) {
//   const projectDetails = "It is a react project";
//   const llmRole = "You are a front end developer";
//   const componentText = "Consider the following code";
//   const outputText =
//     "Your response should be just the code, nothing else, no explaination";
//   const designPreferences = "";
//   const text = `Write a very simple React functional component named "Header" using javascript. Do not include explanations or markdown. Do not include import react or export statment. Output only the component code. `;
// }

// function backupFile(filePath) {
//   const content = fs.readFileSync(filePath, "utf8");
//   const timestamp = new Date().toISOString().replace(/[:.]/g, "_");
//   const fileName = path.basename(filePath);
//   const backupPath = path.join("llm_backups", `${fileName}_${timestamp}.bak`);
//   fs.writeFileSync(backupPath, content);
// }

// function restoreLastBackup(filePath) {
//   const fileName = path.basename(filePath);
//   const backups = fs
//     .readdirSync("llm_backups")
//     .filter((f) => f.startsWith(fileName))
//     .sort()
//     .reverse();
//   if (backups.length === 0) return;
//   const lastBackup = path.join("llm_backups", backups[0]);
//   const backupContent = fs.readFileSync(lastBackup, "utf8");
//   fs.writeFileSync(filePath, backupContent);
// }

// // file: scanStructure.js
// // const fs from 'fs');
// // const path from 'path');

// import fs from "fs";
// import path from "path";

// function walk(dir, fileList = []) {
//   const files = fs.readdirSync(dir);
//   for (const file of files) {
//     const filepath = path.join(dir, file);
//     const stat = fs.statSync(filepath);
//     if (stat.isDirectory()) {
//       walk(filepath, fileList);
//     } else {
//       const relativePath = path.relative(process.cwd(), filepath);
//       const content = fs.readFileSync(filepath, 'utf-8');
//       fileList.push({ file: relativePath, content });
//     }
//   }
//   return fileList;
// }

// const files = walk('./src');
// const summary = files.map(f => `--- ${f.file} ---\n${f.content}`).join('\n\n');
// fs.writeFileSync('structure.txt', summary);

/**
 * Recursively crawls component directories
 * and builds Looma component registry.
 *
 * ------------------------------------------------------------
 * WHY RECURSIVE CRAWLING IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Modern React applications almost always
 * organize components in nested structures.
 *
 * Example:
 *
 * src/components/
 *   Dashboard/
 *     Header/
 *     Sidebar/
 *
 * Flat-only crawling becomes insufficient
 * for scalable applications.
 *
 * This function recursively traverses
 * all nested component directories.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * - crawls nested component directories
 * - finds JSX/TSX component files
 * - detects CSS files
 * - generates component registry entries
 * - supports scalable project structures
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentsPath
 * Root components directory.
 *
 * Example:
 *
 * src/components
 *
 * @param {Object} params.registry
 * Existing registry object.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * Component registry object.
 *
 */

function createComponentRegistry({
  componentsPath,
  projectRoot,
  registry = {},
}: {
  componentsPath: string;
  projectRoot: string;
  registry?: object;
}): ComponentRegistry {
  /**
   * ----------------------------------------------------------
   * INTERNAL RECURSIVE DIRECTORY WALKER
   * ----------------------------------------------------------
   */

  function walkDirectory(currentDirectory) {
    // --------------------------------------------------------
    // Read all files/folders inside current directory
    // --------------------------------------------------------

    const entries = fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    });

    // --------------------------------------------------------
    // Process every directory entry
    // --------------------------------------------------------

    for (const entry of entries) {
      // ------------------------------------------------------
      // Build absolute path
      // ------------------------------------------------------

      const absoluteEntryPath = path.join(currentDirectory, entry.name);

      // ------------------------------------------------------
      // Build project-relative path
      // ------------------------------------------------------

      const relativeEntryPath = path.relative(projectRoot, absoluteEntryPath);

      // ------------------------------------------------------
      // RECURSIVE DIRECTORY HANDLING
      // ------------------------------------------------------

      if (entry.isDirectory()) {
        // ----------------------------------------------------
        // Continue recursive crawl
        // ----------------------------------------------------

        walkDirectory(absoluteEntryPath);

        // ----------------------------------------------------
        // Move to next entry
        // ----------------------------------------------------

        continue;
      }

      // ------------------------------------------------------
      // Skip non JSX/TSX files
      // ------------------------------------------------------

      const isComponentFile =
        entry.name.endsWith(".jsx") || entry.name.endsWith(".tsx");

      if (!isComponentFile) {
        continue;
      }

      // ------------------------------------------------------
      // Extract component name
      // ------------------------------------------------------

      const componentType = path.extname(entry.name);
      const componentName = path.basename(entry.name, componentType);

      // ------------------------------------------------------
      // Build component id
      // ------------------------------------------------------

      const componentId = `cmp_${componentName.toLowerCase()}`;

      // --------------------------------------------------------
      // Read component source code
      // --------------------------------------------------------

      const code = fs.readFileSync(
        path.join(currentDirectory, entry.name),
        "utf8"
      );

      // --------------------------------------------------------
      // Parse AST
      // --------------------------------------------------------

      const ast = parse(code, {
        sourceType: "module",
        plugins: [componentType === ".tsx" ? "typescript" : "jsx"],
      });

      // --------------------------------------------------------
      // Default metadata values
      // --------------------------------------------------------

      let exported = false;

      let props = [];

      let rootElement = null;

      const childComponents = [];

      // --------------------------------------------------------
      // Traverse AST
      // --------------------------------------------------------

      traverse.default(ast, {
        // ------------------------------------------------------
        // Detect exported component
        // ------------------------------------------------------

        ExportDefaultDeclaration(path) {
          exported = true;
        },

        // ------------------------------------------------------
        // Detect component declaration
        // ------------------------------------------------------

        FunctionDeclaration(path) {
          // ----------------------------------------------------
          // Ignore unrelated functions
          // ----------------------------------------------------

          if (path.node.id.name !== componentName) {
            return;
          }

          // ----------------------------------------------------
          // Extract props
          // ----------------------------------------------------

          const firstParam = path.node.params[0];

          // ----------------------------------------------------
          // props object destructuring
          //
          // function Header({
          //   title,
          //   logo
          // })
          // ----------------------------------------------------

          if (t.isObjectPattern(firstParam)) {
            firstParam.properties.forEach((property) => {
              if (t.isObjectProperty(property)) {
                if (t.isIdentifier(property.key)) {
                  props.push(property.key.name);
                }
              }
            });
          }

          // ----------------------------------------------------
          // plain props object
          //
          // function Header(props)
          // ----------------------------------------------------

          if (t.isIdentifier(firstParam)) {
            props.push(firstParam.name);
          }
        },

        // ------------------------------------------------------
        // Detect JSX root element
        // ------------------------------------------------------

        ReturnStatement(path) {
          // ----------------------------------------------------
          // Only inspect JSX returns
          // ----------------------------------------------------

          if (!t.isJSXElement(path.node.argument)) {
            return;
          }

          const openingElement = path.node.argument.openingElement;

          // ----------------------------------------------------
          // Extract root element name
          //
          // Example:
          //
          // <header>
          // ----------------------------------------------------

          if (t.isJSXIdentifier(openingElement.name)) {
            rootElement = openingElement.name.name;
          }
        },

        // ------------------------------------------------------
        // Detect child component usage
        // ------------------------------------------------------

        JSXOpeningElement(path) {
          // ----------------------------------------------------
          // Ignore html tags
          // ----------------------------------------------------

          if (!t.isJSXIdentifier(path.node.name)) {
            return;
          }

          const tagName = path.node.name.name;

          // ----------------------------------------------------
          // React component names start uppercase
          // ----------------------------------------------------

          const isReactComponent = /^[A-Z]/.test(tagName);

          if (!isReactComponent) {
            return;
          }

          // ----------------------------------------------------
          // Ignore self-reference
          // ----------------------------------------------------

          if (tagName === componentName) {
            return;
          }

          // ----------------------------------------------------
          // Prevent duplicates
          // ----------------------------------------------------

          if (!childComponents.includes(tagName)) {
            childComponents.push(tagName);
          }
        },
      });

      // ------------------------------------------------------
      // Detect CSS file
      // ------------------------------------------------------

      const cssCandidates = [
        `${componentName}.css`,
        `${componentName}.module.css`,
      ];

      // ------------------------------------------------------
      // Try finding matching CSS file
      // ------------------------------------------------------

      let cssPath = null;

      for (const cssFileName of cssCandidates) {
        // ----------------------------------------------------
        // Build candidate CSS path
        // ----------------------------------------------------

        const absoluteCssPath = path.join(currentDirectory, cssFileName);

        // ----------------------------------------------------
        // Check if CSS file exists
        // ----------------------------------------------------

        if (fs.existsSync(absoluteCssPath)) {
          // --------------------------------------------------
          // Store project-relative css path
          // --------------------------------------------------

          cssPath = path.relative(projectRoot, absoluteCssPath);

          break;
        }
      }

      // ------------------------------------------------------
      // Create registry entry
      // ------------------------------------------------------

      registry[componentId] = {
        componentId,

        componentName,

        filePath: relativeEntryPath,

        cssPath: fs.existsSync(cssPath) ? cssPath : null,

        importPath: relativeEntryPath,

        parentComponent: null,

        childComponents,

        exported,

        props,

        rootElement,

        lastUpdated: Date.now(),
      };

      // ----------------------------------------------------------
      // STEP 5:
      // Resolve parent-child relationships
      // ----------------------------------------------------------

      Object.values(registry).forEach((component: any) => {
        component.childComponents.forEach((childName) => {
          // --------------------------------------------------
          // Find matching child component
          // --------------------------------------------------

          const childComponent: any = Object.values(registry).find(
            (entry: any) => entry.componentName === childName
          );

          if (!childComponent) {
            return;
          }

          // --------------------------------------------------
          // Assign parent relationship
          // --------------------------------------------------

          childComponent.parentComponent = component.componentName;
        });
      });
    }
  }

  // ----------------------------------------------------------
  // Start recursive crawling
  // ----------------------------------------------------------

  walkDirectory(componentsPath);

  // ----------------------------------------------------------
  // Return final registry
  // ----------------------------------------------------------

  return { ...registry } as ComponentRegistry;
}

/**
 * Reads package.json and returns:
 *
 * - dependencies
 * - devDependencies
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma's planner must understand:
 *
 * - available UI libraries
 * - routing libraries
 * - css systems
 * - animation libraries
 * - state management tools
 *
 * before generating code.
 *
 * Example:
 *
 * If project already has:
 *
 * - tailwindcss
 * - framer-motion
 * - react-router-dom
 *
 * then Looma should REUSE them
 * instead of generating custom solutions.
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful before:
 *
 * - planning mutations
 * - generating components
 * - generating styles
 * - deciding architecture
 * - choosing UI patterns
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.projectRoot
 * Root directory of project.
 *
 * Example:
 *
 * "/Users/sarv/project"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   dependencies,
 *   devDependencies,
 *   allPackages
 * }
 *
 */
function getProjectDependencies({
  projectRoot,
}: {
  projectRoot: string;
}): ProjectDependencies {
  // ----------------------------------------------------------
  // STEP 1:
  // Build absolute package.json path
  // ----------------------------------------------------------

  const packageJsonPath = path.join(path.resolve(projectRoot), "package.json");

  // ----------------------------------------------------------
  // STEP 2:
  // Validate package.json existence
  // ----------------------------------------------------------

  if (!fs.existsSync(packageJsonPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `package.json not found at: ${packageJsonPath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read package.json file
  // ----------------------------------------------------------

  const packageJsonContent = fs.readFileSync(packageJsonPath, "utf8");

  // ----------------------------------------------------------
  // STEP 4:
  // Parse JSON safely
  // ----------------------------------------------------------

  let packageJson;

  try {
    packageJson = JSON.parse(packageJsonContent);
  } catch (error) {
    throw new LoomaError(
      ERROR_CODES.INTERNAL_ERROR,
      `Invalid package.json format`
    );
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Extract dependencies
  // ----------------------------------------------------------

  const dependencies = packageJson.dependencies || {};

  // ----------------------------------------------------------
  // STEP 6:
  // Extract devDependencies
  // ----------------------------------------------------------

  const devDependencies = packageJson.devDependencies || {};

  // ----------------------------------------------------------
  // STEP 7:
  // Merge all packages
  // ----------------------------------------------------------

  const allPackages = {
    ...dependencies,
    ...devDependencies,
  };

  // ----------------------------------------------------------
  // STEP 8:
  // Return package information
  // ----------------------------------------------------------

  return {
    dependencies,
    devDependencies,
    allPackages,
  };
}

function runtimeUiSnapshot() {
  return {
    currentRoute: "/dashboard",

    visibleComponents: [
      {
        id: "cmp_42",
        name: "Sidebar",
        bounds: {},
        visible: true,
      },
    ],

    selectedComponent: {
      id: "cmp_42",
    },

    appState: {
      theme: "dark",
      auth: true,
    },

    viewport: {
      width: 1440,
      height: 900,
    },
  };
}

function getOperationById() {}

// function generateTasksDocs(filePath) {
//   const code = fs.readFileSync(path.resolve(filePath), "utf8");
//   // console.log(code);

//   const ast = parse(code, {
//     sourceType: "module",
//     plugins: ["typescript", "jsx"],
//   });

//   const exportedNames = new Set();
//   const functionDetails = {};

//   // Helper to extract the "Description: ..." text from a node's leading comments
//   function extractDescription(node) {
//     if (!node.leadingComments) return "";

//     for (const comment of node.leadingComments) {
//       // Look for "Description:" followed by any text inside the block comment
//       const match = comment.value.match(/DescriptionForPrompt:\s*(.*)/i);
//       if (match && match[1]) {
//         return match[1].trim(); // Returns just the description string
//       }
//     }
//     return "";
//   }

//   function extractJSDocReturns(node) {
//     if (!node.leadingComments) return "";

//     for (const comment of node.leadingComments) {
//       // This regex looks for @returns followed by anything wrapped in double curly braces {{ ... }}
//       // The 's' flag at the end allows the regex to match across multiple lines
//       const match = comment.value.match(/@returns\s*\{\{(.*?)\}\}/s);

//       if (match && match[1]) {
//         // 1. Split the captured block into individual lines
//         // 2. Remove leading spaces and JSDoc asterisks (*) from each line
//         // 3. Filter out empty lines and join them back together
//         const cleanedLines = match[1]
//           .split("\n")
//           .map((line) => line.replace(/^\s*\*\s*/, "").trim())
//           .filter((line) => line.length > 0);

//         // Reconstruct the object string format
//         return `{\n  ${cleanedLines.join("\n  ")}\n}`;
//       }
//     }
//     return "";
//   }

//   // Helper to convert Babel parameter nodes back into a string
//   function getParamsString(paramsNodes) {
//     return paramsNodes.map((param) => generate.default(param).code).join(", ");
//   }

//   // 1. First Pass: Find what is exported via module.exports
//   traverse.default(ast, {
//     AssignmentExpression(path) {
//       const { left, right } = path.node;
//       const isModuleExports =
//         left.type === "MemberExpression" &&
//         t.isIdentifier(left.object) &&
//         left.object.name === "module" &&
//         t.isIdentifier(left.property) &&
//         left.property.name === "exports";

//       if (isModuleExports && right.type === "ObjectExpression") {
//         for (const prop of right.properties) {
//           if (
//             prop.type === "ObjectProperty" &&
//             t.isIdentifier(prop.key) &&
//             prop.key.name
//           ) {
//             exportedNames.add(prop.key.name);
//           }
//         }
//       }
//     },
//   });

//   // 2. Second Pass: Extract parameters AND descriptions
//   traverse.default(ast, {
//     // Matches: function fun1() {}
//     FunctionDeclaration(path) {
//       const name = path.node.id?.name;
//       if (exportedNames.has(name)) {
//         let actualReturn = "void";

//         // Safe inner traversal using the current path context
//         path.traverse({
//           ReturnStatement(innerPath) {
//             if (innerPath.getFunctionParent().node !== path.node) return; // Skip sub-functions
//             actualReturn = innerPath.node.argument
//               ? generate.default(innerPath.node.argument).code
//               : "undefined";
//           },
//         });

//         functionDetails[name] = {
//           params: getParamsString(path.node.params),
//           returnsDoc: extractJSDocReturns(path.node) || "void",
//           actualReturn: actualReturn.replace(/\s+/g, " "),
//           description: extractDescription(path.node),
//         };
//       }
//     },

//     // Matches: const fun1 = () => {}
//     // Note: Comments are attached to the VariableDeclaration statement container
//     VariableDeclarator(path) {
//       const name = t.isIdentifier(path.node.id) ? path.node.id.name : null;
//       if (exportedNames.has(name)) {
//         const init = path.node.init;
//         if (
//           init &&
//           ["ArrowFunctionExpression", "FunctionExpression"].includes(init.type)
//         ) {
//           // For variables, leadingComments live on the parent VariableDeclaration node
//           const parentNode = path.parentPath.node;

//           let actualReturn = "void";
//           // Arrow functions can have an implicit return expression instead of a block statement body
//           if (
//             (t.isFunctionExpression(init) ||
//               t.isArrowFunctionExpression(init)) &&
//             init.body.type !== "BlockStatement"
//           ) {
//             // Implicit arrow return: () => ({ status: 'ok' })
//             actualReturn = generate.default(init.body).code;
//           } else {
//             // Block statement arrow return: () => { return { status: 'ok' } }
//             path.traverse({
//               ReturnStatement(innerPath) {
//                 if (innerPath.getFunctionParent().node !== init) return; // Skip sub-functions
//                 actualReturn = innerPath.node.argument
//                   ? generate.default(innerPath.node.argument).code
//                   : "undefined";
//               },
//             });
//           }

//           const complexReturnDoc = extractJSDocReturns(path.parentPath.node);
//           functionDetails[name] = {
//             params:
//               t.isFunctionExpression(init) || t.isArrowFunctionExpression(init)
//                 ? getParamsString(init.params)
//                 : "",
//             returnsDoc: complexReturnDoc || "void",
//             actualReturn: actualReturn.replace(/\s+/g, " "),
//             description: extractDescription(parentNode),
//           };
//         }
//       }
//     },
//   });

//   // 3. Format the documentation string
//   const formattedLines = Array.from(exportedNames).map((name: any) => {
//     const details = functionDetails[name];
//     if (!details) return `${name}()`;

//     const paramStr = details.params;
//     const descStr = details.description ? ` - ${details.description}` : "";
//     return `${name}(${paramStr}) returns ${details.returnsDoc}${descStr}`;
//     //   return `
//     //   ${name}: {
//     //   payload: ${paramStr};

//     //   result: ${details.actualReturn};
//     // };
//     //   `;
//   });

//   const functionsListString = formattedLines.join("\n");

//   return functionsListString;
// }

function appendAction({ command, operations, undoPath }) {
  // Generate a unique action id.
  const actionId = `ac_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;

  // Construct the action object.
  const action = {
    id: actionId,
    command,
    operations,
    timestamp: new Date().toISOString(),
  };

  // Read the current contents of undo.json.
  const actions = readActionStack(undoPath);

  // Append the new action to the stack.
  actions.push(action);

  // Persist the updated stack.
  writeActionStack(undoPath, actions);

  console.log("Logged action:", actionId);
}

/**
 * Reads an action stack (undo.json or redo.json).
 *
 * - Creates the file if it does not exist.
 * - Initializes it with an empty array if needed.
 * - Returns the parsed array of actions.
 *
 * @param {string} filePath
 * @returns {Array}
 */
function readActionStack(filePath) {
  // Create the file if it doesn't exist.
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, "[]", "utf8");
  }

  // Read the contents of the file.
  const fileContents = fs.readFileSync(filePath, "utf8").trim();

  // Treat an empty file as an empty stack.
  if (fileContents.length === 0) {
    return [];
  }

  // Parse and return the action stack.
  return JSON.parse(fileContents);
}

/**
 * Writes an action stack (undo.json or redo.json).
 *
 * @param {string} filePath
 * @param {Array} actions
 */
function writeActionStack(filePath, actions) {
  // Persist the updated stack in a readable format.
  fs.writeFileSync(filePath, JSON.stringify(actions, null, 2), "utf8");
}

// function appendLLMLog(log) {
//   console.log(path.resolve("./looma-logs/llm-logs.jsonl"));
//   fs.appendFileSync(
//     "./looma-logs/llm-logs.jsonl",
//     JSON.stringify(log) + "\n",
//     "utf8",
//   );
// }

async function listFiles({
  directory,
  recursive,
}: {
  directory?: string;
  recursive?: boolean;
}): Promise<{
  files: string[];
}> {
  const files = [];

  async function walk(dir) {
    const entries = await fs.promises.readdir(dir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (recursive) {
          await walk(fullPath);
        }
      } else {
        files.push(fullPath);
      }
    }
  }

  await walk(directory);

  return { files };
}

function readFile(filePath: string): string {
  return fs.readFileSync(filePath, "utf8");
}

function writeFile({
  filePath,
  content,
}: {
  filePath: string;
  content: string;
}): void {
  const formatted = formatCode(content);
  fs.writeFileSync(filePath, formatted, "utf8");
}

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

  // findImportDeclaration,
  // buildImportDeclaration,
  // getImportSpecifiers,
  // removeImportSpecifier,
  // mergeImportDeclarations,
  // isImportUsed,

  // do not expose
  // ensureLibrary,

  // ensureComponentStructure,
  // normalizeComponent,

  // findComponentDirectory,
  // inferComponentName,

  matchesSelector,
  // ensureStyleFile,
  // findCssSelector,
  // resolveCssClassConflicts,
  resolveStyleDependencies,
  listFiles,
  // parseAST,
  // parseCSS,
  // parseRoutes,
  // parseComponentDependencies,
  // parseProps,
  // // parseTypescriptTypes,
  // parseExports,
  // parseJSCode,
  // parseHooksUsage,
  // // parseStateUsage,
  // // parseEventHandlers,
  // // parseAPICalls,
  // // parseDOMHierarchy,
  generateCodeFromAST,

  createComponentRegistry,
  getProjectDependencies,
  runtimeUiSnapshot,
  getExportedFunctionNames,
  generateTasksDocs,
  resolveTaskReferences,
  appendAction,
  // mutationTasks,
  // astTasks,
  formatCode,
  formatObjectCode,
  readFile,
  writeFile,
};
