import fs from "fs";
import path from "path";
import traverse from "@babel/traverse";
import t from "@babel/types";
import postcss from "postcss";

import { ERROR_CODES } from "../../schemas/index.js";
import type {
  TaskPayload,
  TaskReturn,
  TaskResponse,
  AppContext,
} from "../../schemas/index.js";

import { LoomaError } from "../../server/error.js";

/*

const importPath = findImportDeclaration({
  ast,
  source: "react",
});

if (importPath) {
  console.log(importPath.node);
}

*/
function findImportDeclaration({ ast, source }) {
  let importDeclarationPath = null;

  traverse.default(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === source) {
        importDeclarationPath = path;
        path.stop();
      }
    },
  });

  return importDeclarationPath;
}

/**
* Finds the deepest AST node that exists at a specific line number.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function searches an AST and returns the node
* that belongs to a given source-code line.
*
* Example:
*
* CODE:
*
* 1 | import React from 'react';
* 2 |
* 3 | function Header() {
* 4 |   return <div>Hello</div>;
* 5 | }
*
* Calling:
*
* findNodeByLine({ ast, line: 4 })
*
* may return:
*
* JSXElement node
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered code editing systems,
* users often refer to code by location.
*
* Examples:
*
* - "replace code at line 20"
* - "insert variable near line 15"
* - "wrap JSX around line 42"
* - "delete component at line 10"
*
* AST traversal alone is not enough.
*
* We also need:
*
* source-code location mapping.
*
* ------------------------------------------------------------
* WHAT IS NODE LOCATION?
* ------------------------------------------------------------
*
* Babel AST nodes contain:
*
* node.loc.start.line
* node.loc.end.line
*
* Example:
*
* function Header() {}
*
* may internally store:
*
* start.line = 3
* end.line = 5
*
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* findNodeByLine is:
*
* INTERNAL ONLY
*
* WHY?
*
* Users never explicitly ask:
*
* "find AST node by line"
*
* Instead:
*
* higher-level primitives internally use it.
*
* ------------------------------------------------------------
* WHY THIS FUNCTION IS IMPORTANT
* ------------------------------------------------------------
*
* Many editing primitives need precise targeting.
*
* Example:
*
* insertVariable()
*
* may need:
*
* "insert near line 20"
*
* Example:
*
* replaceJSX()
*
* may need:
*
* "replace JSX around line 55"
*
* ------------------------------------------------------------
* HOW MATCHING WORKS
* ------------------------------------------------------------
*
* A node matches when:
*
* targetLine >= start.line
* AND
* targetLine <= end.line
*
* Example:
*
* function Header() {
*   return <div />;
* }
*
* covers:
*
* lines 3 → 5
*
* ------------------------------------------------------------
* DEEPEST NODE STRATEGY
* ------------------------------------------------------------
*
* Many nodes overlap same line.
*
* Example:
*
* function Header() {
*   return <div>Hello</div>;
* }
*
* line 4 belongs to:
*
* - FunctionDeclaration
* - ReturnStatement
* - JSXElement
* - JSXText
*
* This function returns:
*
* deepest matching node.
*
* WHY?
*
* Deepest node is usually most precise target.
*
* Useful in
* - insertVariable
* - updateVariable
* - deleteVariable
* - insertJSX
* - replaceJSX
* - removeJSX
* - wrapJSX
* - moveJSX
* - updateFunction
* - deleteFunction
* - updateComponent
* - deleteComponent
* - codeReplace
*
* 
* High Level Primitive
   ↓
parseAST
   ↓
findNodeByLine
   ↓
AST modification
   ↓
generateCode
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - returns single deepest node
*
* Future improvements:
*
* - return node path
* - filter node types
* - nearest sibling lookup
* - parent traversal helpers
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
* @param {number} params.line
* Target source-code line number.
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {object|null}
* Matching AST node or null.
*
*/
function findNodeByLine({
  ast,
  line,
}: TaskPayload<any>): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Store best matching node
  //
  // Initially:
  //
  // no node found.
  // ----------------------------------------------------------

  let matchedNode = null;

  // ----------------------------------------------------------
  // STEP 2:
  // Store current deepest node depth
  //
  // WHY?
  //
  // Multiple nodes may overlap same line.
  //
  // We prefer deepest node.
  // ----------------------------------------------------------

  let deepestDepth = -1;

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse entire AST
  // ----------------------------------------------------------

  traverse.default(ast, {
    enter(path) {
      // ------------------------------------------------------
      // Ignore nodes without source location
      //
      // Some synthetic/generated nodes may not
      // contain loc information.
      // ------------------------------------------------------

      if (!path.node.loc) {
        return;
      }

      // ------------------------------------------------------
      // Extract node line range
      // ------------------------------------------------------

      const startLine = path.node.loc.start.line;

      const endLine = path.node.loc.end.line;

      // ------------------------------------------------------
      // Check whether target line exists inside
      // current node range
      //
      // Example:
      //
      // line 5 matches:
      //
      // start=3
      // end=8
      // ------------------------------------------------------

      const isMatching = line >= startLine && line <= endLine;

      // ------------------------------------------------------
      // Ignore unrelated nodes
      // ------------------------------------------------------

      if (!isMatching) {
        return;
      }

      // ------------------------------------------------------
      // Calculate current traversal depth
      //
      // WHY?
      //
      // Deeper nodes are usually more precise.
      // ------------------------------------------------------

      const currentDepth = path.getAncestry().length;

      // ------------------------------------------------------
      // Replace current match if:
      //
      // - node is deeper
      // ------------------------------------------------------

      if (currentDepth > deepestDepth) {
        matchedNode = path.node;
        deepestDepth = currentDepth;
      }
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Return best matching node
  // ----------------------------------------------------------

  return matchedNode;
}

/**
* Finds a React component in AST using component name.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function searches AST and returns the component node
* matching a specific component name.
*
* Example:
*
* CODE:
*
* function Header() {
*   return <div>Header</div>;
* }
*
* Calling:
*
* findComponentInJsx({
*   ast,
*   componentName: "Header"
* })
*
* returns:
*
* FunctionDeclaration node
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered frontend systems,
* many operations target components by name.
*
* Examples:
*
* - "update Header component"
* - "delete Navbar component"
* - "wrap Sidebar component"
* - "extract Footer component"
*
* AST traversal alone is not enough.
*
* We need:
*
* semantic component lookup.
*
* Usefull in 
* - updateComponent
* - deleteComponent
* - renameComponent
* - wrapComponent
* - splitComponent
* - mergeComponents
* - extractComponent
* - insertJSX
* - replaceJSX
* - removeJSX
* - moveJSX

parseAST
   ↓
findComponentInJsx
   ↓
AST modification
   ↓
generateCode
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* findComponentInJsx is:
*
* INTERNAL ONLY
*
* WHY?
*
* Users never directly ask:
*
* "find AST component node"
*
* Instead:
*
* higher-level primitives internally use it.
*
* ------------------------------------------------------------
* SUPPORTED COMPONENT TYPES
* ------------------------------------------------------------
*
* Current implementation supports:
*
* 1) Function declarations
*
* function Header() {}
*
* 2) Arrow function components
*
* const Header = () => {}
*
* 3) Function expression components
*
* const Header = function() {}
*
* ------------------------------------------------------------
* HOW COMPONENT DETECTION WORKS
* ------------------------------------------------------------
*
* Current heuristic:
*
* - component name must start with uppercase letter
* - must be function-based
*
* WHY?
*
* React components conventionally use:
*
* PascalCase
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - does not verify JSX return existence
*
* Meaning:
*
* utility functions with uppercase names
* may also match.
*
* Future improvements:
*
* - verify JSX return
* - support memo()
* - support forwardRef()
* - support lazy()
* - support class components
*
* ------------------------------------------------------------
* RETURN VALUE
* ------------------------------------------------------------
*
* Returns:
*
* Babel NodePath
*
* instead of plain node.
*
* WHY?
*
* NodePath provides:
*
* - parent traversal
* - replacement APIs
* - removal APIs
* - insertion APIs
*
* which are essential for transformations.
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
* @param {string} params.componentName
* Component name to search.
*
* Example:
* "Header"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {NodePath|null}
* Matching component path or null.
*
*/
function findComponentInJsx(
  { ast, componentName }: TaskPayload<any>,
  context: AppContext,
): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Store matching component path
  //
  // Initially:
  //
  // no component found.
  // ----------------------------------------------------------

  let matchedPath = null;

  // ----------------------------------------------------------
  // STEP 2:
  // Traverse entire AST
  // ----------------------------------------------------------

  traverse.default(ast, {
    // --------------------------------------------------------
    // CASE 1:
    // Function declaration component
    //
    // Example:
    //
    // function Header() {}
    // --------------------------------------------------------

    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Extract function name
      // ------------------------------------------------------

      const functionName = path.node.id?.name;

      // ------------------------------------------------------
      // Ignore anonymous functions
      // ------------------------------------------------------

      if (!functionName) {
        return;
      }

      // ------------------------------------------------------
      // Check whether name matches target
      // ------------------------------------------------------

      if (functionName === componentName) {
        matchedPath = path;

        // ----------------------------------------------------
        // Stop traversal once component found
        // ----------------------------------------------------

        path.stop();
      }
    },

    // --------------------------------------------------------
    // CASE 2:
    // Variable declaration components
    //
    // Examples:
    //
    // const Header = () => {}
    //
    // const Header = function() {}
    // --------------------------------------------------------

    VariableDeclarator(path) {
      // ------------------------------------------------------
      // Extract variable name
      // ------------------------------------------------------

      const variableName = t.isIdentifier(path.node.id)
        ? path.node.id.name
        : undefined;

      // ------------------------------------------------------
      // Ignore unrelated variables
      // ------------------------------------------------------

      if (variableName !== componentName) {
        return;
      }

      // ------------------------------------------------------
      // Extract assigned value
      // ------------------------------------------------------

      const init = path.node.init;

      // ------------------------------------------------------
      // Check whether assigned value is:
      //
      // - ArrowFunctionExpression
      // OR
      // - FunctionExpression
      // ------------------------------------------------------

      const isFunctionComponent =
        t.isArrowFunctionExpression(init) || t.isFunctionExpression(init);

      // ------------------------------------------------------
      // Ignore non-function assignments
      // ------------------------------------------------------

      if (!isFunctionComponent) {
        return;
      }

      // ------------------------------------------------------
      // Store matching path
      // ------------------------------------------------------

      matchedPath = path;

      // ------------------------------------------------------
      // Stop traversal once component found
      // ------------------------------------------------------

      path.stop();
    },
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Return matching component path
  // ----------------------------------------------------------

  return matchedPath;
}

/**
* Finds a JSX element inside AST.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function searches AST and returns a JSX element
* matching specific conditions.
*
* Example:
*
* CODE:
*
* <div>
*   <Header />
* </div>
*
* Calling:
*
* findJSXElement({
*   ast,
*   elementName: "Header"
* })
*
* returns:
*
* JSXElement path for:
*
* <Header />
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered frontend systems,
* many UI operations target JSX elements.
*
* Examples:
*
* - "wrap button with div"
* - "remove Header component usage"
* - "move sidebar below navbar"
* - "replace card JSX"
* - "insert modal inside layout"
*
* Raw string manipulation becomes unreliable.
*
* We need:
*
* semantic JSX lookup.
*
* Useful in:
* - insertJSX
* - replaceJSX
* - removeJSX
* - wrapJSX
* - moveJSX
* - splitComponent
* - mergeComponents
* - extractComponent
* 
parseAST
   ↓
findJSXElement
   ↓
JSX modification
   ↓
generateCode
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* findJSXElement is:
*
* INTERNAL ONLY
*
* WHY?
*
* Users never directly ask:
*
* "find JSX AST node"
*
* Instead:
*
* higher-level primitives internally use it.
*
* ------------------------------------------------------------
* WHAT COUNTS AS JSX ELEMENT?
* ------------------------------------------------------------
*
* Examples:
*
* <div />
* <Header />
* <Button></Button>
*
* All are:
*
* JSXElement nodes.
*
* ------------------------------------------------------------
* HOW MATCHING WORKS
* ------------------------------------------------------------
*
* Matching is based on:
*
* openingElement.name
*
* Example:
*
* <Header />
*
* name becomes:
*
* "Header"
*
* ------------------------------------------------------------
* SUPPORTED ELEMENT TYPES
* ------------------------------------------------------------
*
* Current implementation supports:
*
* - HTML elements
* - React components
*
* Examples:
*
* div
* span
* Header
* Sidebar
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - supports simple JSX names only
*
* NOT:
*
* <UI.Header />
*
* because:
*
* JSXMemberExpression
* is more complex.
*
* Future improvements:
*
* - support member expressions
* - support nested filters
* - support parent matching
* - support attribute matching
* - support nth occurrence selection
*
* ------------------------------------------------------------
* RETURN VALUE
* ------------------------------------------------------------
*
* Returns:
*
* Babel NodePath
*
* instead of plain node.
*
* WHY?
*
* NodePath enables:
*
* - replaceWith()
* - remove()
* - insertBefore()
* - insertAfter()
*
* essential for JSX transformations.
*
* ------------------------------------------------------------
* FIRST MATCH STRATEGY
* ------------------------------------------------------------
*
* Current implementation:
*
* - returns first matching JSX element
*
* WHY?
*
* Simpler deterministic behavior.
*
* Future improvement:
*
* - return all matches
* - return exact occurrence
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
* @param {string} params.elementName
* JSX tag/component name.
*
* Example:
* "Header"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {NodePath|null}
* Matching JSX path or null.
*
*/
function findJSXElement({
  ast,
  elementName,
}: TaskPayload<any>): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Store matching JSX path
  //
  // Initially:
  //
  // no JSX element found.
  // ----------------------------------------------------------

  let matchedPath = null;

  // ----------------------------------------------------------
  // STEP 2:
  // Traverse entire AST
  // ----------------------------------------------------------

  traverse.default(ast, {
    JSXElement(path) {
      // ------------------------------------------------------
      // Extract opening element
      //
      // Example:
      //
      // <Header />
      //
      // openingElement = Header
      // ------------------------------------------------------

      const openingElement = path.node.openingElement;

      // ------------------------------------------------------
      // Extract JSX tag name node
      // ------------------------------------------------------

      const nameNode = openingElement.name;

      // ------------------------------------------------------
      // Ignore complex JSX names
      //
      // Example:
      //
      // <UI.Header />
      //
      // because it becomes:
      //
      // JSXMemberExpression
      // ------------------------------------------------------

      if (!t.isJSXIdentifier(nameNode)) {
        return;
      }

      // ------------------------------------------------------
      // Extract actual JSX tag name
      //
      // Example:
      //
      // <Header />
      //
      // becomes:
      //
      // "Header"
      // ------------------------------------------------------

      const currentElementName = nameNode.name;

      // ------------------------------------------------------
      // Ignore unrelated JSX elements
      // ------------------------------------------------------

      if (currentElementName !== elementName) {
        return;
      }

      // ------------------------------------------------------
      // Store matching JSX path
      // ------------------------------------------------------

      matchedPath = path;

      // ------------------------------------------------------
      // Stop traversal once found
      // ------------------------------------------------------

      path.stop();
    },
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Return matching JSX path
  // ----------------------------------------------------------

  return matchedPath;
}

/**
 * Finds a component directory inside a project.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function recursively searches
 * component directories and returns:
 *
 * - matching component path
 * - component metadata
 *
 * Example:
 *
 * Searching:
 *
 * "Header"
 *
 * may return:
 *
 * "./src/components/layout/Header"
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Runtime AI editing requires:
 *
 * deterministic component lookup.
 *
 * User commands usually reference:
 *
 * logical component names.
 *
 * Example:
 *
 * - "update header"
 * - "make navbar red"
 * - "extract footer"
 *
 * But the backend needs:
 *
 * actual filesystem location.
 *
 * This function acts as:
 *
 * component resolution layer.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER rely on:
 *
 * fragile path guessing.
 *
 * Component discovery must be:
 *
 * - recursive
 * - deterministic
 * - architecture-aware
 *
 * Eventually this should integrate with:
 *
 * component registry system.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * performs filesystem traversal.
 *
 * Production version should preferably use:
 *
 * in-memory component registry
 *
 * because:
 *
 * recursive disk traversal becomes expensive
 * in very large projects.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - createComponent()
 * - updateComponent()
 * - moveComponent()
 * - renameComponent()
 * - extractComponent()
 * - ensureComponentStructure()
 * - normalizeComponent()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "update header"
 * - "delete navbar"
 * - "move card component"
 * - "extract footer"
 * - "rename sidebar"
 * - "find hero section"
 *
 * Usually executed BEFORE:
 *
 * - component mutations
 * - JSX mutations
 * - CSS synchronization
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.rootDirectory
 * Root directory to start searching from.
 *
 * Example:
 *
 * "./src/components"
 *
 * @param {string} params.componentName
 * Component name to find.
 *
 * Example:
 *
 * "Header"
 *
 * @param {boolean} [params.caseSensitive=false]
 * Whether search should be case sensitive.
 *
 * @param {boolean} [params.returnFirst=true]
 * Whether search should stop at first match.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object|null}
 *
 * {
 *   componentName,
 *   componentPath,
 *   jsxPath,
 *   cssPath,
 *   exists
 * }
 *
 * OR
 *
 * null
 *
 */
function findComponentDirectory(
  {
    // rootDirectory,
    componentName,
    caseSensitive = false,
    returnFirst = true,
  }: TaskPayload<"findComponentDirectory">,
  context: AppContext,
): TaskResponse<TaskReturn<"findComponentDirectory">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute root directory
  // ----------------------------------------------------------

  const absoluteRootDirectory = context.project.root;

  // ----------------------------------------------------------
  // STEP 2:
  // Validate root directory existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteRootDirectory)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Root directory does not exist: ${absoluteRootDirectory}`,
      {
        payload: {
          componentName,
          caseSensitive: false,
          returnFirst: true,
        },
      },
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Store search result
  // ----------------------------------------------------------

  let foundComponent = null;

  // ----------------------------------------------------------
  // STEP 4:
  // Recursive directory traversal function
  // ----------------------------------------------------------

  function traverseDirectory(currentDirectory) {
    // --------------------------------------------------------
    // Stop traversal if component already found
    // --------------------------------------------------------

    if (foundComponent && returnFirst) {
      return;
    }

    // --------------------------------------------------------
    // Read current directory entries
    // --------------------------------------------------------

    const entries = fs.readdirSync(currentDirectory, {
      withFileTypes: true,
    });

    // --------------------------------------------------------
    // Traverse directory entries
    // --------------------------------------------------------

    for (const entry of entries) {
      // ------------------------------------------------------
      // Build absolute entry path
      // ------------------------------------------------------

      const entryPath = path.join(currentDirectory, entry.name);

      // ------------------------------------------------------
      // Skip non-directories
      // ------------------------------------------------------

      if (!entry.isDirectory()) {
        continue;
      }

      // ------------------------------------------------------
      // Normalize names for comparison
      // ------------------------------------------------------

      const normalizedEntryName = caseSensitive
        ? entry.name
        : entry.name.toLowerCase();

      const normalizedTargetName = caseSensitive
        ? componentName
        : componentName.toLowerCase();

      // ------------------------------------------------------
      // Check component match
      // ------------------------------------------------------

      if (normalizedEntryName === normalizedTargetName) {
        // ----------------------------------------------------
        // Build potential JSX file path
        // ----------------------------------------------------

        const jsxPath = path.join(entryPath, `${entry.name}.jsx`);

        // ----------------------------------------------------
        // Build potential CSS file path
        // ----------------------------------------------------

        const cssPath = path.join(entryPath, `${entry.name}.css`);

        // ----------------------------------------------------
        // Store component metadata
        // ----------------------------------------------------

        foundComponent = {
          componentName: entry.name,

          componentPath: entryPath,

          jsxPath,

          cssPath,

          exists: true,
        };

        // ----------------------------------------------------
        // Stop traversal if configured
        // ----------------------------------------------------

        if (returnFirst) {
          return;
        }
      }

      // ------------------------------------------------------
      // Continue recursive traversal
      // ------------------------------------------------------

      traverseDirectory(entryPath);
    }
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Start recursive traversal
  // ----------------------------------------------------------

  traverseDirectory(absoluteRootDirectory);

  // ----------------------------------------------------------
  // STEP 6:
  // Return found component
  // ----------------------------------------------------------

  if (!foundComponent) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component ${componentName} not found`,
    );
  }

  return { success: true, foundComponent };
}

/**
* Finds CSS selectors inside a parsed CSS AST.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function searches CSS AST
* and returns matching selectors.
*
* Example:
*
* CSS:
*
* .header {
*   color: red;
* }
*
* .header__title {
*   font-size: 20px;
* }
*
* Searching:
*
* ".header"
*
* returns:
*
* matching PostCSS rule nodes.
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* Most advanced CSS operations require:
*
* locating selectors safely.
*
* Example operations:
*
* - update selector styles
* - remove selector
* - rename selector
* - analyze declarations
* - optimize css
*
* Regex becomes unreliable
* for large CSS systems.
*
* AST selector traversal is safer.
*
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL DECISION
* ------------------------------------------------------------
*
* This function works on:
*
* CSS AST
*
* NOT raw css strings.
*
* This enables:
*
* deterministic CSS tooling.
*
* ------------------------------------------------------------
* DEPENDENCIES
* ------------------------------------------------------------
*
* This function assumes:
*
* - parseCSS()
*
* already exists.
*
* It complements:
*
* - updateStyles()
* - removeStyles()
* - renameCssClass()
* - syncComponentStyles()
*
* ------------------------------------------------------------
* WHERE THIS FUNCTION IS USEFUL
* ------------------------------------------------------------
*
* Useful in commands like:
*
* - "make button red"
* - "remove card shadow"
* - "rename css class"
* - "find responsive styles"
* - "update navbar styles"
* - "cleanup unused css"
*
* Usually executed BEFORE:
*
* - css mutations
* - selector updates
* - declaration analysis
*
* Example usage:

const { ast } = parseCSS({
 cssPath: "./Header.css",
});

const matches =
 findCssSelector({
   ast,
   selector: ".header",
 });

console.log(matches);

or

findCssSelector({
 ast,
 selector: /^\.header/,
});
* ------------------------------------------------------------
* IMPORTANT NOTE
* ------------------------------------------------------------
*
* This function ONLY finds selectors.
*
* It does NOT:
*
* - modify css
* - remove selectors
* - insert styles
* - write files
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
* @param {Object} params.ast
* Parsed PostCSS AST.
*
* Usually returned from:
*
* parseCSS()
*
* @param {string|RegExp} params.selector
* Selector to search.
*
* Example:
*
* ".header"
*
* OR
*
* /^\.header/
*
* @param {boolean} [params.findAll=true]
* Whether to return all matches.
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {Object[]}
*
* Array of matching PostCSS rule nodes.
*
*/
function findCssSelector({
  ast,
  selector,
  findAll = true,
}: {
  ast: postcss.Root;
  selector: string | RegExp;
  findAll?: boolean;
}): TaskResponse<TaskReturn<"findCssSelector">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Validate AST existence
  // ----------------------------------------------------------

  if (!ast) {
    throw new LoomaError(ERROR_CODES.INTERNAL_ERROR, "CSS AST is required");
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Store matching selectors
  // ----------------------------------------------------------

  const matches = [];

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse all CSS rules
  //
  // Example:
  //
  // .header {}
  // .card {}
  // ----------------------------------------------------------

  ast.walkRules((rule) => {
    // --------------------------------------------------------
    // Extract selector text
    //
    // Example:
    //
    // ".header"
    // --------------------------------------------------------

    const ruleSelector = rule.selector;

    // --------------------------------------------------------
    // Handle string selector search
    // --------------------------------------------------------

    if (typeof selector === "string") {
      // ------------------------------------------------------
      // Exact selector match
      // ------------------------------------------------------

      if (ruleSelector === selector) {
        matches.push(rule);

        // ----------------------------------------------------
        // Stop early if only first match needed
        // ----------------------------------------------------

        if (!findAll) {
          return false;
        }
      }
    }

    // --------------------------------------------------------
    // Handle RegExp selector search
    // --------------------------------------------------------
    else if (selector instanceof RegExp) {
      // ------------------------------------------------------
      // Match regex against selector
      // ------------------------------------------------------

      if (selector.test(ruleSelector)) {
        matches.push(rule);

        // ----------------------------------------------------
        // Stop early if only first match needed
        // ----------------------------------------------------

        if (!findAll) {
          return false;
        }
      }
    }
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Return matching selectors
  // ----------------------------------------------------------

  if (matches.length === 0) {
    return { success: false, message: `Selector ${selector} not found` };
  }

  return { success: true, matches };
}

export default {
  // insertCode,

  // expose only when planner becomes mature enough to use it directly
  // ensureImport,
  // removeImport,
  // enrichImport,
  // optimizeImports,
  // updateComponentImports,
  findNodeByLine,
  findComponentInJsx,
  findJSXElement,
  findComponentDirectory,
  findCssSelector,
};
