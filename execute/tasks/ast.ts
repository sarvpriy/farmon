/*

Pure Tasks: AST/code transforms only: Changes will happen in memmory, but not reflected in actual file system.
-----------
insertJSX - Inserts new JSX into a target component.
replaceJSX - Replaces an existing JSX element with new JSX.
removeJSX - Removes a JSX element from a component.
moveJSX - Moves a JSX element to a different location in the JSX tree.
wrapJSX - Wraps a JSX element with a parent JSX element.
insertVariable - Inserts a new variable declaration into code.
updateVariable - Updates an existing variable declaration.
deleteVariable - Removes a variable declaration from code.
createFunction - Creates a new function declaration.
updateFunction - Updates an existing function declaration.
deleteFunction - Removes a function declaration from code.
renameCssClass - Renames a CSS class in both CSS and JSX.


*/

import fs from "fs";
import path from "path";
// import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import { parse, parseExpression } from "@babel/parser";
import { generate } from "@babel/generator";
import t from "@babel/types";
import postcss from "postcss";

import helpers from "../../execute/helpers/general.js";

import utils from "../../execute/helpers/general.js";
import {
  type TaskPayload,
  type TaskReturn,
  type TaskResponse,
  ERROR_CODES,
  ExecutionContext,
} from "../../schemas/index.js";
import { LoomaError } from "../../server/error.js";

/**
 * DescriptionForPrompt: Inserts a new variable declaration into code.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function inserts variables in:
 *
 * 1) global/module scope
 * OR
 * 2) inside a function/component scope
 *
 * ------------------------------------------------------------
 * EXAMPLES
 * ------------------------------------------------------------
 *
 * GLOBAL SCOPE
 *
 * BEFORE:
 *
 * import React from "react";
 *
 * function App() {}
 *
 * AFTER:
 *
 * import React from "react";
 *
 * const API_URL = "/api";
 *
 * function App() {}
 *
 * ------------------------------------------------------------
 *
 * FUNCTION / COMPONENT SCOPE
 *
 * BEFORE:
 *
 * function App() {
 *   return <div />;
 * }
 *
 * AFTER:
 *
 * function App() {
 *   const count = 0;
 *
 *   return <div />;
 * }
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Variable insertion is NOT safe using string replacement.
 *
 * Because:
 * - imports may move
 * - formatting changes
 * - nested scopes exist
 * - components/functions vary
 *
 * AST manipulation guarantees:
 * - correct scope
 * - valid syntax
 * - deterministic insertion
 *
 * Useful commands:
 * - add state: insertVariable(count)
 * - store api url: insertVariable(API_URL)
 * - add loading state: insertVariable(loading)
 * - add mock data: insertVariable(mockData)
 * - save form values: insertVariable(formValues)
 * 
 * User Command
    ↓
Planner
    ↓
insertVariable
    ↓
updateJSX / updateFunction
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * This simplifies deterministic targeting.
 *
 * ------------------------------------------------------------
 * SUPPORTED VALUE TYPES
 * ------------------------------------------------------------
 *
 * string
 * number
 * boolean
 * object
 * array
 * null
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.variableName
 * Name of variable to insert.
 *
 * @param {any} params.value
 * Initial value of variable.
 *
 * @param {"global"|"function"} params.scope
 * Where variable should be inserted.
 *
 * @param {string=} params.functionName
 * Required when scope === "function"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function insertVariable(
  { code, variableName, value, scope, functionName },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Convert JS value into AST expression
  //
  // Example:
  //
  // "hello" -> StringLiteral
  // 123     -> NumericLiteral
  // ----------------------------------------------------------

  const valueNode = t.valueToNode(value);

  // ----------------------------------------------------------
  // STEP 3:
  // Create variable declaration AST node
  //
  // Example:
  //
  // const count = 0;
  // ----------------------------------------------------------

  const variableDeclaration = t.variableDeclaration("const", [
    t.variableDeclarator(t.identifier(variableName), valueNode),
  ]);

  // ==========================================================
  // GLOBAL SCOPE INSERTION
  // ==========================================================

  if (scope === "global") {
    // --------------------------------------------------------
    // Find last import statement
    //
    // WHY?
    //
    // Variables should appear AFTER imports.
    //
    // GOOD:
    //
    // import React from "react";
    //
    // const API_URL = "...";
    //
    // --------------------------------------------------------

    let insertIndex = 0;

    // --------------------------------------------------------
    // Iterate through top-level statements
    // --------------------------------------------------------

    ast.program.body.forEach((node, index) => {
      // ------------------------------------------------------
      // Track last import position
      // ------------------------------------------------------

      if (t.isImportDeclaration(node)) {
        insertIndex = index + 1;
      }
    });

    // --------------------------------------------------------
    // Insert variable after imports
    // ------------------------------------------------------

    ast.program.body.splice(insertIndex, 0, variableDeclaration);
  }

  // ==========================================================
  // FUNCTION / COMPONENT SCOPE INSERTION
  // ==========================================================

  if (scope === "function") {
    // --------------------------------------------------------
    // Traverse AST searching target function
    // --------------------------------------------------------

    traverse.default(ast, {
      FunctionDeclaration(path) {
        // ----------------------------------------------------
        // Ignore unrelated functions
        // ----------------------------------------------------

        if (path.node.id?.name !== functionName) {
          return;
        }

        // ----------------------------------------------------
        // Get function body statements
        //
        // Example:
        //
        // function App() {
        //   BODY HERE
        // }
        // ----------------------------------------------------

        const bodyStatements = path.node.body.body;

        // ----------------------------------------------------
        // Insert variable at beginning of function body
        //
        // BEFORE:
        //
        // function App() {
        //   return <div />
        // }
        //
        // AFTER:
        //
        // function App() {
        //   const count = 0;
        //   return <div />
        // }
        // ----------------------------------------------------

        bodyStatements.unshift(variableDeclaration);
      },
    });
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Updates the value of an existing variable.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function searches for a variable declaration and
 * replaces its value.
 *
 * ------------------------------------------------------------
 * EXAMPLES
 * ------------------------------------------------------------
 *
 * BEFORE:
 *
 * const API_URL = "/api";
 *
 * AFTER:
 *
 * const API_URL = "/v2/api";
 *
 * ------------------------------------------------------------
 *
 * BEFORE:
 *
 * const loading = false;
 *
 * AFTER:
 *
 * const loading = true;
 *
 * ------------------------------------------------------------
 *
 * BEFORE:
 *
 * const count = 0;
 *
 * AFTER:
 *
 * const count = 10;
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Updating variables using string replacement is dangerous.
 *
 * Because:
 * - duplicate variable names may exist
 * - nested scopes may exist
 * - formatting changes break regex logic
 *
 * AST manipulation ensures:
 * - valid syntax
 * - deterministic updates
 * - structure-aware targeting
 * 
 * 
 * Useful commands:
 * - change api url:updateVariable(API_URL)
 * - set loading true:updateVariable(loading)
 * - change default count to 10:updateVariable(count)
 * - update mock data:updateVariable(mockData)
 * - change theme color:updateVariable(themeColor)
 *
 * User Command
      ↓
  Planner
      ↓
  updateVariable
      ↓
  updateJSX / updateFunction
 * 
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * This function only updates variable declarations.
 *
 * Example:
 *
 * const count = 0;
 *
 * It does NOT update:
 *
 * count = 5;
 *
 * because assignment expressions are a separate concern.
 *
 * ------------------------------------------------------------
 * SUPPORTED VALUE TYPES
 * ------------------------------------------------------------
 *
 * string
 * number
 * boolean
 * object
 * array
 * null
 *
 * ------------------------------------------------------------
 * OPTIONAL LINE TARGETING
 * ------------------------------------------------------------
 *
 * Multiple variables with same name may exist.
 *
 * Example:
 *
 * const data = 1;
 *
 * function App() {
 *   const data = 2;
 * }
 *
 * line can be used for deterministic targeting.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.variableName
 * Name of variable to update.
 *
 * @param {any} params.newValue
 * New value for variable.
 *
 * @param {number=} params.line
 * Optional declaration line number.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function updateVariable(
  { code, variableName, newValue, line },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Convert JS value into AST node
  //
  // Example:
  //
  // "hello" -> StringLiteral
  // 123     -> NumericLiteral
  // ----------------------------------------------------------

  const newValueNode = t.valueToNode(newValue);

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST searching variable declarations
  // ----------------------------------------------------------

  traverse.default(ast, {
    VariableDeclarator(path) {
      // ------------------------------------------------------
      // Ignore unrelated variables
      // ------------------------------------------------------

      if (path.node.id.type !== "Identifier") {
        return;
      }

      if (path.node.id.name !== variableName) {
        return;
      }

      // ------------------------------------------------------
      // Optional line targeting
      //
      // If line provided:
      // only update matching declaration line
      // ------------------------------------------------------

      if (line && path.node.loc?.start.line !== line) {
        return;
      }

      // ------------------------------------------------------
      // Replace variable value
      //
      // BEFORE:
      // const count = 0;
      //
      // AFTER:
      // const count = 10;
      // ------------------------------------------------------

      path.node.init = newValueNode;
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Removes a variable declaration from code.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function removes variable declarations.
 *
 * Example:
 *
 * BEFORE:
 *
 * const loading = true;
 *
 * AFTER:
 *
 * <removed>
 *
 * ------------------------------------------------------------
 * SUPPORTED DECLARATIONS
 * ------------------------------------------------------------
 *
 * const
 * let
 * var
 *
 * ------------------------------------------------------------
 * IMPORTANT BEHAVIOR
 * ------------------------------------------------------------
 *
 * This function removes:
 *
 * - only the matching variable declarator
 *
 * Example:
 *
 * BEFORE:
 *
 * const a = 1, b = 2;
 *
 * deleteVariable("a")
 *
 * AFTER:
 *
 * const b = 2;
 *
 * ------------------------------------------------------------
 *
 * If all declarators are removed:
 *
 * BEFORE:
 *
 * const a = 1;
 *
 * AFTER:
 *
 * <entire statement removed>
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Variable deletion using regex/string replacement is fragile.
 *
 * Problems:
 * - multiline declarations
 * - nested scopes
 * - duplicate variable names
 * - comma-separated variables
 *
 * AST guarantees:
 * - syntax-safe deletion
 * - deterministic targeting
 * - scope-aware manipulation
 *
 * Useful commands:
 * - remove loading state: deleteVariable(loading)
 * - delete mock data: deleteVariable(mockData)
 * - remove api url: deleteVariable(API_URL)
 * - clear temporary state: deleteVariable(tempState)
 * - remove unused variable: deleteVariable(variableName)
 *
 * ------------------------------------------------------------
 * OPTIONAL LINE TARGETING
 * ------------------------------------------------------------
 *
 * Multiple variables with same name may exist.
 *
 * Example:
 *
 * const data = 1;
 *
 * function App() {
 *   const data = 2;
 * }
 *
 * line allows precise targeting.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * This function removes declarations only.
 *
 * It does NOT:
 * - remove usages
 * - remove JSX references
 * - optimize imports
 *
 * Those should be separate cleanup steps.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.variableName
 * Variable to remove.
 *
 * @param {number=} params.line
 * Optional declaration line number.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function deleteVariable(
  { code, variableName, line },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Traverse AST searching variable declarations
  // ----------------------------------------------------------

  traverse.default(ast, {
    VariableDeclaration(path) {
      // ------------------------------------------------------
      // Filter matching declarators
      //
      // Example:
      //
      // const a = 1, b = 2;
      //
      // removing "a" keeps only "b"
      // ------------------------------------------------------

      const remainingDeclarators = path.node.declarations.filter(
        (declarator) => {
          // ------------------------------------------------
          // Ignore non-Identifier patterns
          //
          // Example:
          // const { a } = obj;
          // ------------------------------------------------

          if (declarator.id.type !== "Identifier") {
            return true;
          }

          // ------------------------------------------------
          // Keep unrelated variables
          // ------------------------------------------------

          if (declarator.id.name !== variableName) {
            return true;
          }

          // ------------------------------------------------
          // Optional line targeting
          //
          // Remove only if line matches
          // ------------------------------------------------

          if (line && declarator.loc?.start.line !== line) {
            return true;
          }

          // ------------------------------------------------
          // Returning false removes declarator
          // ------------------------------------------------

          return false;
        },
      );

      // ------------------------------------------------------
      // If no declarators remain:
      // remove entire variable statement
      //
      // BEFORE:
      //
      // const a = 1;
      //
      // AFTER:
      //
      // <removed>
      // ------------------------------------------------------

      if (remainingDeclarators.length === 0) {
        path.remove();
        return;
      }

      // ------------------------------------------------------
      // Otherwise update remaining declarators
      // ------------------------------------------------------

      path.node.declarations = remainingDeclarators;
    },
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Creates a new function declaration.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function creates a standard JavaScript function
 * declaration and inserts it into the file.
 *
 * Example:
 *
 * BEFORE:
 *
 * function App() {
 *   return <div />;
 * }
 *
 * AFTER:
 *
 * function formatPrice(price) {
 *   return `$${price}`;
 * }
 *
 * function App() {
 *   return <div />;
 * }
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Function creation using string concatenation is fragile.
 *
 * Problems:
 * - invalid syntax
 * - incorrect insertion position
 * - broken formatting
 * - nested scope mistakes
 *
 * AST guarantees:
 * - syntax-safe insertion
 * - deterministic structure
 * - scope awareness
 * - formatting preserved
 *
 * Useful commands:
 * - add submit handler: createFunction(handleSubmit)
 * - create formatter function: createFunction(formatPrice)
 * - add validation logic: createFunction(validateForm)
 * - add api fetch function: createFunction(fetchUsers)
 * - create helper function: createFunction(helper)
 *
 * createFunction
    ↓
insertJSX / updateFunction
    ↓
optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation uses ONLY:
 *
 * function declarations
 *
 * Example:
 *
 * function myFunc() {}
 *
 * NOT:
 *
 * const myFunc = () => {}
 *
 * This keeps architecture deterministic and easy to analyze.
 *
 * ------------------------------------------------------------
 * INSERTION STRATEGY
 * ------------------------------------------------------------
 *
 * Global scope:
 * - inserted after imports
 *
 * Function scope:
 * - inserted inside target function
 *
 * ------------------------------------------------------------
 * FUNCTION BODY
 * ------------------------------------------------------------
 *
 * body should contain raw JavaScript statements.
 *
 * Example:
 *
 * return value * 2;
 *
 * NOT:
 *
 * {
 *   return value * 2;
 * }
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.functionName
 * Name of function to create.
 *
 * @param {string[]} params.params
 * Array of parameter names.
 *
 * Example:
 * ["price", "currency"]
 *
 * @param {string} params.body
 * Raw JavaScript statements.
 *
 * @param {"global"|"function"} params.scope
 * Where function should be inserted.
 *
 * @param {string=} params.parentFunctionName
 * Required if scope === "function"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function createFunction({
  code,
  functionName,
  params = [],
  body = "",
  scope = "global",
  parentFunctionName,
}: TaskResponse<TaskPayload<any>>): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Convert parameter names into AST identifiers
  //
  // Example:
  //
  // ["price"]
  //
  // becomes:
  //
  // Identifier(price)
  // ----------------------------------------------------------

  const functionParams = params.map((param: string) => t.identifier(param));

  // ----------------------------------------------------------
  // STEP 3:
  // Parse function body into AST statements
  //
  // WHY?
  //
  // Babel requires valid AST statements inside function body.
  //
  // Example:
  //
  // return value * 2;
  // ----------------------------------------------------------

  const parsedBody = parse(body, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Create FunctionDeclaration AST node
  //
  // Example:
  //
  // function formatPrice(price) {
  //   return `$${price}`;
  // }
  // ----------------------------------------------------------

  const functionDeclaration = t.functionDeclaration(
    t.identifier(functionName),
    functionParams,
    t.blockStatement(parsedBody.program.body),
  );

  // ==========================================================
  // GLOBAL SCOPE INSERTION
  // ==========================================================

  if (scope === "global") {
    // --------------------------------------------------------
    // Find insertion point after imports
    // --------------------------------------------------------

    let insertIndex = 0;

    ast.program.body.forEach((node, index) => {
      if (t.isImportDeclaration(node)) {
        insertIndex = index + 1;
      }
    });

    // --------------------------------------------------------
    // Insert function after imports
    // --------------------------------------------------------

    ast.program.body.splice(insertIndex, 0, functionDeclaration);
  }

  // ==========================================================
  // FUNCTION SCOPE INSERTION
  // ==========================================================

  if (scope === "function") {
    // --------------------------------------------------------
    // Traverse AST searching parent function
    // --------------------------------------------------------

    traverse.default(ast, {
      FunctionDeclaration(path) {
        // ----------------------------------------------------
        // Ignore unrelated functions
        // ----------------------------------------------------

        if (path.node.id?.name !== parentFunctionName) {
          return;
        }

        // ----------------------------------------------------
        // Insert child function at top of body
        // ----------------------------------------------------

        path.node.body.body.unshift(functionDeclaration);
      },
    });
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Updates an existing function declaration.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function replaces the contents of an existing function.
 *
 * Example:
 *
 * BEFORE:
 *
 * function calculate() {
 *   return 1;
 * }
 *
 * AFTER:
 *
 * function calculate() {
 *   return 10;
 * }
 *
 * ------------------------------------------------------------
 * IMPORTANT BEHAVIOR
 * ------------------------------------------------------------
 *
 * This function:
 *
 * - preserves function name
 * - preserves parameters
 * - preserves declaration type
 *
 * It ONLY replaces:
 *
 * - function body
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Function updates using string replacement are dangerous.
 *
 * Problems:
 * - nested braces
 * - multiline formatting
 * - duplicate function names
 * - invalid syntax generation
 *
 * AST guarantees:
 * - structure-aware updates
 * - valid syntax
 * - deterministic replacement
 *
 * Useful commands:
 * - change submit logic: updateFunction(handleSubmit)
 * - update validation function: updateFunction(validateForm)
 * - modify fetch api logic: updateFunction(fetchUsers)
 * - change formatter behavior: updateFunction(formatPrice)
 * - replace helper logic: updateFunction(helper)
 *
 * updateFunction
      ↓
  updateJSX / optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation supports ONLY:
 *
 * function declarations
 *
 * Example:
 *
 * function myFunc() {}
 *
 * NOT:
 *
 * const myFunc = () => {}
 *
 * ------------------------------------------------------------
 * BODY FORMAT
 * ------------------------------------------------------------
 *
 * body should contain raw JavaScript statements.
 *
 * Example:
 *
 * return data.map(item => item.name);
 *
 * NOT:
 *
 * {
 *   return data.map(...);
 * }
 *
 * ------------------------------------------------------------
 * OPTIONAL LINE TARGETING
 * ------------------------------------------------------------
 *
 * Multiple functions with same name may exist.
 *
 * line targeting allows deterministic selection.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.functionName
 * Function to update.
 *
 * @param {string} params.newBody
 * New raw JavaScript statements.
 *
 * @param {number=} params.line
 * Optional function declaration line.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function updateFunction({
  code,
  functionName,
  newBody,
  line,
}: TaskResponse<TaskPayload<any>>): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Parse new function body into AST statements
  //
  // Example:
  //
  // return 10;
  // ----------------------------------------------------------

  const parsedBody = parse(newBody, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST searching function declarations
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore anonymous functions
      // ------------------------------------------------------

      if (!path.node.id) {
        return;
      }

      // ------------------------------------------------------
      // Ignore unrelated functions
      // ------------------------------------------------------

      if (path.node.id.name !== functionName) {
        return;
      }

      // ------------------------------------------------------
      // Optional precise line targeting
      // ------------------------------------------------------

      if (line && path.node.loc?.start?.line !== line) {
        return;
      }

      // ------------------------------------------------------
      // Replace function body
      //
      // BEFORE:
      //
      // function test() {
      //   return 1;
      // }
      //
      // AFTER:
      //
      // function test() {
      //   return 10;
      // }
      // ------------------------------------------------------

      path.node.body = t.blockStatement(parsedBody.program.body);
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Removes a function declaration from code.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function removes an entire function declaration.
 *
 * Example:
 *
 * BEFORE:
 *
 * function formatPrice(price) {
 *   return `$${price}`;
 * }
 *
 * AFTER:
 *
 * <removed>
 *
 * ------------------------------------------------------------
 * IMPORTANT BEHAVIOR
 * ------------------------------------------------------------
 *
 * This function removes:
 *
 * - the complete function declaration
 * - function name
 * - parameters
 * - body
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Function deletion using regex/string replacement is fragile.
 *
 * Problems:
 * - nested braces
 * - multiline functions
 * - formatting variations
 * - duplicate function names
 *
 * AST guarantees:
 * - syntax-safe removal
 * - deterministic targeting
 * - structure-aware deletion
 *
 * Useful commands:
 * - remove submit handler: deleteFunction(handleSubmit)
 * - delete helper function: deleteFunction(helper)
 * - remove validation logic: deleteFunction(validateForm)
 * - remove formatter: deleteFunction(formatPrice)
 * - delete fetch function: deleteFunction(fetchUsers)
 * 
 * deleteFunction
      ↓
  remove usages
      ↓
  optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation supports ONLY:
 *
 * function declarations
 *
 * Example:
 *
 * function myFunc() {}
 *
 * NOT:
 *
 * const myFunc = () => {}
 *
 * ------------------------------------------------------------
 * OPTIONAL LINE TARGETING
 * ------------------------------------------------------------
 *
 * Multiple functions with same name may exist.
 *
 * Example:
 *
 * function helper() {}
 *
 * function helper() {}
 *
 * line targeting allows deterministic selection.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * This function ONLY removes function declarations.
 *
 * It does NOT:
 * - remove function calls
 * - remove JSX usage
 * - remove imports
 * - optimize imports
 *
 * Those should happen in separate cleanup passes.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.functionName
 * Name of function to remove.
 *
 * @param {number=} params.line
 * Optional function declaration line.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function deleteFunction({
  code,
  functionName,
  line,
}: TaskResponse<TaskPayload<any>>): TaskResponse<TaskReturn<any>> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Traverse AST searching function declarations
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore anonymous functions
      // ------------------------------------------------------

      if (!path.node.id) {
        return;
      }

      // ------------------------------------------------------
      // Ignore unrelated functions
      // ------------------------------------------------------

      if (path.node.id.name !== functionName) {
        return;
      }

      // ------------------------------------------------------
      // Optional precise line targeting
      //
      // Useful when duplicate names exist
      // ------------------------------------------------------

      if (line && path.node.loc?.start?.line !== line) {
        return;
      }

      // ------------------------------------------------------
      // Remove entire function declaration
      //
      // BEFORE:
      //
      // function helper() {}
      //
      // AFTER:
      //
      // <removed>
      // ------------------------------------------------------

      path.remove();
    },
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Inserts new JSX into a target component.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function inserts JSX elements into:
 *
 * - a component's returned JSX
 * - a target JSX element
 *
 * Example:
 *
 * BEFORE:
 *
 * function Header() {
 *   return (
 *     <header>
 *       <h1>Logo</h1>
 *     </header>
 *   );
 * }
 *
 * AFTER:
 *
 * function Header() {
 *   return (
 *     <header>
 *       <h1>Logo</h1>
 *       <button>Sign Up</button>
 *     </header>
 *   );
 * }
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In UI generation systems,
 * users frequently say:
 *
 * - "add button"
 * - "add search input"
 * - "add hero section"
 * - "insert navbar"
 *
 * These commands usually mean:
 *
 * "insert JSX into existing UI"
 *
 * NOT:
 *
 * "replace entire component"
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX insertion using string replacement is extremely fragile.
 *
 * Problems:
 * - nested JSX
 * - formatting changes
 * - self-closing tags
 * - conditional rendering
 * - fragments
 *
 * AST guarantees:
 * - valid JSX structure
 * - deterministic insertion
 * - syntax-safe manipulation
 * 
 * Useful commands:
 * - add sign up button: insertJSX(button)
 * - add logo in header: insertJSX(img/logo)
 * - insert search bar: insertJSX(input)
 * - add navigation links: insertJSX(nav links)
 * - add hero section: insertJSX(section)
 *
 * insertJSX
    ↓
ensureImport
    ↓
optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * ------------------------------------------------------------
 * INSERTION STRATEGY
 * ------------------------------------------------------------
 *
 * This function inserts JSX:
 *
 * - inside a target JSX element
 *
 * Example:
 *
 * targetElement = "header"
 *
 * JSX gets inserted INSIDE:
 *
 * <header>
 *   HERE
 * </header>
 *
 * ------------------------------------------------------------
 * SUPPORTED TARGETS
 * ------------------------------------------------------------
 *
 * HTML tags:
 * - div
 * - header
 * - main
 * - section
 *
 * React components:
 * - Layout
 * - Sidebar
 * - Card
 *
 * ------------------------------------------------------------
 * JSX FORMAT
 * ------------------------------------------------------------
 *
 * jsx should contain valid JSX ONLY.
 *
 * Example:
 *
 * <button>Login</button>
 *
 * NOT:
 *
 * return <button />
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * This function currently inserts:
 *
 * - at end of target children
 *
 * Future improvements:
 * - before element
 * - after element
 * - prepend
 * - replace child
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code like this not just jsx
 * function Header() {
 *   return (
 *     <header>
 *       <h1>Logo</h1>
 *     </header>
 *   );
 * }
 *
 * @param {string} params.componentName
 * Component containing JSX.
 *
 * @param {string} params.targetElement
 * JSX element where content should be inserted.
 *
 * Example:
 * "header"
 *
 * @param {string} params.jsx
 * Only JSX to insert.
 * <button>Login</button>
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function insertJSX(
  { code, componentName, targetElement, jsx, position },
  context: ExecutionContext,
) {
  // const updatedCode = await formatCode(code);
  // return { success: true, updatedCode };
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Parse JSX snippet into AST node
  //
  // Example:
  //
  // <button>Login</button>
  // ----------------------------------------------------------

  const jsxNode = parseExpression(jsx, {
    plugins: ["jsx"],
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST searching target component
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated components
      // ------------------------------------------------------

      if (path.node.id?.name !== componentName) {
        return;
      }

      // ------------------------------------------------------
      // Traverse inside component body
      // ------------------------------------------------------

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Get opening tag name
          //
          // Example:
          //
          // <header>
          //    ^
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated JSX elements
          // --------------------------------------------------

          if (
            !helpers.matchesSelector({
              openingElement,
              selector: targetElement,
            })
          ) {
            return;
          }

          // --------------------------------------------------
          // Insert JSX according to requested position
          //
          // first:
          //
          // <header>
          //   <button />
          //   <h1 />
          // </header>
          //
          // last:
          //
          // <header>
          //   <h1 />
          //   <button />
          // </header>
          // --------------------------------------------------

          if (position === "first") {
            jsxPath.node.children.unshift(
              t.jsxExpressionContainer(jsxNode),
              t.jsxText("\n"),
            );
          } else {
            jsxPath.node.children.push(
              t.jsxText("\n"),
              t.jsxExpressionContainer(jsxNode),
            );
          }

          // --------------------------------------------------
          // Stop traversal after insertion
          // --------------------------------------------------

          jsxPath.stop();
        },
      });
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated source code from AST
  // ----------------------------------------------------------
  const updatedCode = utils.formatCode(generate(ast).code);
  return { success: true, updatedCode };
}

/**
 * DescriptionForPrompt: Replaces an existing JSX element with new JSX.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function searches for a JSX element and completely
 * replaces it with new JSX.
 *
 * Example:
 *
 * BEFORE:
 *
 * <button>Login</button>
 *
 * AFTER:
 *
 * <button className="primary">
 *   Sign Up
 * </button>
 *
 * ------------------------------------------------------------
 * IMPORTANT DIFFERENCE
 * ------------------------------------------------------------
 *
 * insertJSX
 * → inserts INSIDE existing JSX
 *
 * replaceJSX
 * → completely replaces existing JSX node
 *
 * ------------------------------------------------------------
 * EXAMPLE
 * ------------------------------------------------------------
 *
 * BEFORE:
 *
 * function Header() {
 *   return (
 *     <header>
 *       <button>Login</button>
 *     </header>
 *   );
 * }
 *
 * AFTER:
 *
 * function Header() {
 *   return (
 *     <header>
 *       <button className="primary">
 *         Sign Up
 *       </button>
 *     </header>
 *   );
 * }
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Users frequently give commands like:
 *
 * - "replace login button"
 * - "change navbar into sidebar"
 * - "replace div with section"
 * - "make button outlined"
 *
 * These commands usually mean:
 *
 * "replace existing JSX element"
 *
 * NOT:
 *
 * "insert new JSX"
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX replacement using string replacement is fragile.
 *
 * Problems:
 * - nested JSX
 * - duplicate elements
 * - multiline formatting
 * - invalid syntax generation
 * - conditional rendering
 *
 * AST guarantees:
 * - valid JSX
 * - deterministic replacement
 * - structure-aware manipulation
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * ------------------------------------------------------------
 * REPLACEMENT STRATEGY
 * ------------------------------------------------------------
 *
 * This function replaces:
 *
 * - first matching JSX element
 *
 * Example:
 *
 * targetElement = "button"
 *
 * FIRST:
 *
 * <button />
 *
 * gets replaced.
 *
 * ------------------------------------------------------------
 * SUPPORTED TARGETS
 * ------------------------------------------------------------
 *
 * HTML tags:
 * - div
 * - button
 * - header
 * - section
 *
 * React components:
 * - Card
 * - Sidebar
 * - Layout
 *
 * ------------------------------------------------------------
 * JSX FORMAT
 * ------------------------------------------------------------
 *
 * newJSX should contain valid JSX ONLY.
 *
 * Example:
 *
 * <button>Save</button>
 *
 * NOT:
 *
 * return <button />
 *
 * Useful commands:
 * - replace login button with signup button: replaceJSX(button)
 * - change div to section: replaceJSX(div)
 * - replace navbar with sidebar: replaceJSX(Navbar)
 * - make button outlined: replaceJSX(button)
 * - replace image with video: replaceJSX(img)
 * 
 * replaceJSX
      ↓
  ensureImport
      ↓
  optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - replaces first matching JSX node only
 *
 * Future improvements:
 * - replace nth match
 * - replace by attribute
 * - replace by text content
 * - replace multiple nodes
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.componentName
 * Component containing JSX.
 *
 * @param {string} params.targetElement
 * JSX element to replace.
 *
 * Example:
 * "button"
 *
 * @param {string} params.newJSX
 * Replacement JSX.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function replaceJSX(
  { code, componentName, targetElement, newJSX },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Parse replacement JSX into AST node
  //
  // Example:
  //
  // <button>Save</button>
  // ----------------------------------------------------------

  const replacementNode = parseExpression(newJSX, {
    plugins: ["jsx"],
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Track whether replacement already happened
  //
  // WHY?
  //
  // Prevent replacing multiple nodes accidentally.
  // ----------------------------------------------------------

  let replaced = false;

  // ----------------------------------------------------------
  // STEP 4:
  // Traverse AST searching component
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated components
      // ------------------------------------------------------

      if (path.node.id?.name !== componentName) {
        return;
      }

      // ------------------------------------------------------
      // Traverse JSX inside component
      // ------------------------------------------------------

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Stop if replacement already done
          // --------------------------------------------------

          if (replaced) {
            return;
          }

          // --------------------------------------------------
          // Get opening JSX tag
          //
          // Example:
          //
          // <button>
          //    ^
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated JSX elements
          // --------------------------------------------------

          if (
            !helpers.matchesSelector({
              openingElement,
              selector: targetElement,
            })
          ) {
            return;
          }

          // --------------------------------------------------
          // Replace JSX node
          //
          // BEFORE:
          //
          // <button>Login</button>
          //
          // AFTER:
          //
          // <button>Save</button>
          // --------------------------------------------------

          jsxPath.replaceWith(replacementNode);

          // --------------------------------------------------
          // Mark replacement completed
          // --------------------------------------------------

          replaced = true;

          // --------------------------------------------------
          // Stop traversal for performance/safety
          // --------------------------------------------------

          jsxPath.stop();
        },
      });
    },
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Removes a JSX element from a component.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function searches for a JSX element and removes it
 * completely from the JSX tree.
 *
 * Example:
 *
 * BEFORE:
 *
 * <header>
 *   <Logo />
 *   <button>Login</button>
 * </header>
 *
 * AFTER:
 *
 * <header>
 *   <Logo />
 * </header>
 *
 * ------------------------------------------------------------
 * IMPORTANT DIFFERENCE
 * ------------------------------------------------------------
 *
 * insertJSX
 * → adds JSX
 *
 * replaceJSX
 * → swaps JSX
 *
 * removeJSX
 * → deletes JSX
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Users frequently give commands like:
 *
 * - "remove login button"
 * - "delete hero section"
 * - "remove image"
 * - "remove sidebar"
 * - "hide footer"
 *
 * These commands usually mean:
 *
 * "remove JSX element from UI tree"
 *
 * NOT:
 *
 * "delete component file"
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX removal using string replacement is fragile.
 *
 * Problems:
 * - nested JSX
 * - multiline formatting
 * - duplicate elements
 * - invalid JSX after deletion
 * - conditional rendering
 *
 * AST guarantees:
 * - syntax-safe deletion
 * - deterministic traversal
 * - structure-aware removal
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * ------------------------------------------------------------
 * REMOVAL STRATEGY
 * ------------------------------------------------------------
 *
 * This function removes:
 *
 * - first matching JSX element
 *
 * Example:
 *
 * targetElement = "button"
 *
 * FIRST:
 *
 * <button />
 *
 * gets removed.
 *
 * ------------------------------------------------------------
 * SUPPORTED TARGETS
 * ------------------------------------------------------------
 *
 * HTML tags:
 * - div
 * - button
 * - img
 * - section
 *
 * React components:
 * - Sidebar
 * - Card
 * - Navbar
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - removes first matching JSX node only
 *
 * Future improvements:
 * - remove nth match
 * - remove by className
 * - remove by text content
 * - remove multiple nodes
 *
 * Useful commands:
 * - remove login button: removeJSX(button)
 * - delete hero section: removeJSX(section)
 * - remove sidebar: removeJSX(Sidebar)
 * - hide footer links: removeJSX(footer)
 * - remove profile image: removeJSX(img)
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * removeJSX should usually be followed by:
 *
 * - removeImport
 * - optimizeImports
 *
 * if deleted JSX used imported components.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.componentName
 * Component containing JSX.
 *
 * @param {string} params.targetElement
 * JSX element to remove.
 *
 * Example:
 * "button"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function removeJSX(
  { code, componentName, targetElement },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Track whether removal already happened
  //
  // WHY?
  //
  // Prevent accidental removal of multiple elements.
  // ----------------------------------------------------------

  let removed = false;

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST searching target component
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated components
      // ------------------------------------------------------

      if (path.node.id?.name !== componentName) {
        return;
      }

      // ------------------------------------------------------
      // Traverse JSX inside component
      // ------------------------------------------------------

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Stop if removal already completed
          // --------------------------------------------------

          if (removed) {
            return;
          }

          // --------------------------------------------------
          // Get opening JSX element
          //
          // Example:
          //
          // <button>
          //    ^
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated JSX elements
          // --------------------------------------------------

          // if (openingElement.name.name !== targetElement) {
          //   return;
          // }

          if (
            !helpers.matchesSelector({
              openingElement,
              selector: targetElement,
            })
          ) {
            return;
          }

          // --------------------------------------------------
          // Remove JSX node
          //
          // BEFORE:
          //
          // <button>Login</button>
          //
          // AFTER:
          //
          // <removed>
          // --------------------------------------------------

          jsxPath.remove();

          // --------------------------------------------------
          // Mark removal completed
          // --------------------------------------------------

          removed = true;

          // --------------------------------------------------
          // Stop traversal for performance/safety
          // --------------------------------------------------

          jsxPath.stop();
        },
      });
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Wraps a JSX element with a parent JSX element.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function takes an existing JSX element and wraps it
 * inside a new parent JSX element.
 *
 * Example:
 *
 * BEFORE:
 *
 * <button>Login</button>
 *
 * AFTER:
 *
 * <div className="container">
 *   <button>Login</button>
 * </div>
 *
 * ------------------------------------------------------------
 * IMPORTANT DIFFERENCE
 * ------------------------------------------------------------
 *
 * insertJSX
 * → adds new JSX
 *
 * replaceJSX
 * → replaces JSX
 *
 * removeJSX
 * → deletes JSX
 *
 * wrapJSX
 * → nests existing JSX inside another JSX
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Users frequently give commands like:
 *
 * - "wrap button in div"
 * - "put card inside container"
 * - "wrap navbar in header"
 * - "add layout wrapper"
 * - "center this section"
 *
 * These commands usually mean:
 *
 * "preserve existing JSX but add parent wrapper"
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX wrapping using string replacement is fragile.
 *
 * Problems:
 * - nested JSX
 * - malformed closing tags
 * - multiline formatting
 * - fragments
 * - conditional rendering
 *
 * AST guarantees:
 * - valid JSX structure
 * - syntax-safe wrapping
 * - deterministic nesting
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * ------------------------------------------------------------
 * WRAPPING STRATEGY
 * ------------------------------------------------------------
 *
 * This function:
 *
 * - finds first matching JSX element
 * - inserts that JSX inside wrapper element
 *
 * Example:
 *
 * targetElement = "button"
 *
 * wrapperJSX =
 *
 * <div className="container"></div>
 *
 * RESULT:
 *
 * <div className="container">
 *   <button />
 * </div>
 *
 *
 * Useful commands:
 * - wrap button in div: wrapJSX(button)
 * - put navbar inside header: wrapJSX(Navbar)
 * - wrap hero section in container: wrapJSX(section)
 * - add layout wrapper: wrapJSX(main)
 * - center this card: wrapJSX(Card)
 * 
 * wrapJSX
      ↓
  ensureImport
      ↓
  optimizeImports
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - wraps first matching node only
 *
 * Future improvements:
 * - wrap multiple nodes
 * - wrap by className
 * - wrap sibling groups
 * - wrap conditional JSX
 *
 * ------------------------------------------------------------
 * WRAPPER FORMAT
 * ------------------------------------------------------------
 *
 * wrapperJSX should be:
 *
 * valid empty JSX container
 *
 * Example:
 *
 * <div className="wrapper"></div>
 *
 * NOT:
 *
 * <div>
 *   Something
 * </div>
 *
 * because children will be injected automatically.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.componentName
 * Component containing JSX.
 *
 * @param {string} params.targetElement
 * JSX element to wrap.
 *
 * Example:
 * "button"
 *
 * @param {string} params.wrapperJSX
 * Parent wrapper JSX.
 *
 * Example:
 * '<div className="container"></div>'
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function wrapJSX(
  { code, componentName, targetElement, wrapperJSX },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Parse wrapper JSX into AST node
  //
  // Example:
  //
  // <div className="wrapper"></div>
  // ----------------------------------------------------------

  const wrapperNode = parseExpression(wrapperJSX, {
    plugins: ["jsx"],
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure wrapper is JSX element
  // ----------------------------------------------------------

  if (!t.isJSXElement(wrapperNode)) {
    throw new LoomaError(
      ERROR_CODES.INVALID_JSX,
      "wrapperJSX must be a valid JSX element",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Track whether wrapping already happened
  // ----------------------------------------------------------

  let wrapped = false;

  // ----------------------------------------------------------
  // STEP 5:
  // Traverse AST searching target component
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated components
      // ------------------------------------------------------

      if (path.node.id?.name !== componentName) {
        return;
      }

      // ------------------------------------------------------
      // Traverse JSX inside component
      // ------------------------------------------------------

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Stop if wrapping already completed
          // --------------------------------------------------

          if (wrapped) {
            return;
          }

          // --------------------------------------------------
          // Get opening JSX tag
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated JSX elements
          // --------------------------------------------------

          if (
            !helpers.matchesSelector({
              openingElement,
              selector: targetElement,
            })
          ) {
            return;
          }

          // --------------------------------------------------
          // Clone wrapper node
          //
          // WHY?
          //
          // Prevent AST reference mutation issues.
          // --------------------------------------------------

          const wrapperClone = t.cloneNode(wrapperNode, true);

          // --------------------------------------------------
          // Inject existing JSX inside wrapper
          //
          // BEFORE:
          //
          // <div className="wrapper"></div>
          //
          // AFTER:
          //
          // <div className="wrapper">
          //   <button />
          // </div>
          // --------------------------------------------------

          wrapperClone.children = [
            t.jsxText("\n"),
            jsxPath.node,
            t.jsxText("\n"),
          ];

          // --------------------------------------------------
          // Replace original JSX with wrapped JSX
          // --------------------------------------------------

          jsxPath.replaceWith(wrapperClone);

          // --------------------------------------------------
          // Mark wrapping completed
          // --------------------------------------------------

          wrapped = true;

          // --------------------------------------------------
          // Stop traversal for safety/performance
          // --------------------------------------------------

          jsxPath.stop();
        },
      });
    },
  });

  // ----------------------------------------------------------
  // STEP 6:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Moves a JSX element to a different location in the JSX tree.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function:
 *
 * 1. Finds a JSX element
 * 2. Removes it from current location
 * 3. Inserts it inside another JSX element
 *
 * Example:
 *
 * BEFORE:
 *
 * <header>
 *   <button>Login</button>
 * </header>
 *
 * <footer></footer>
 *
 * AFTER:
 *
 * <header></header>
 *
 * <footer>
 *   <button>Login</button>
 * </footer>
 *
 * ------------------------------------------------------------
 * IMPORTANT DIFFERENCE
 * ------------------------------------------------------------
 *
 * insertJSX
 * → creates new JSX
 *
 * replaceJSX
 * → swaps JSX
 *
 * removeJSX
 * → deletes JSX
 *
 * wrapJSX
 * → nests JSX
 *
 * moveJSX
 * → relocates existing JSX
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Users frequently give commands like:
 *
 * - "move login button to footer"
 * - "put navbar inside sidebar"
 * - "move search bar to header"
 * - "shift button below form"
 * - "move logo to left section"
 *
 * These commands usually mean:
 *
 * "preserve existing JSX but change location"
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX movement using string replacement is fragile.
 *
 * Problems:
 * - nested JSX
 * - invalid nesting
 * - multiline formatting
 * - duplicate elements
 * - broken parent structure
 *
 * AST guarantees:
 * - syntax-safe movement
 * - deterministic relocation
 * - structure-aware manipulation
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation assumes:
 *
 * - React components use function declarations
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * ------------------------------------------------------------
 * MOVEMENT STRATEGY
 * ------------------------------------------------------------
 *
 * This function:
 *
 * - removes first matching JSX node
 * - inserts it inside destination element
 *
 * Example:
 *
 * sourceElement = "button"
 * destinationElement = "footer"
 *
 * RESULT:
 *
 * <footer>
 *   <button />
 * </footer>
 *
 * Useful commands:
 * - move login button to footer: moveJSX(button → footer)
 * - move search bar into header: moveJSX(input → header)
 * - put navbar inside sidebar: moveJSX(Navbar → Sidebar)
 * - move logo to left section: moveJSX(Logo → div)
 * - shift button below form: moveJSX(button → form)
 * 
 * moveJSX
      ↓
  optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - moves first matching node only
 *
 * Future improvements:
 * - move nth node
 * - move before/after sibling
 * - move by className
 * - reorder sibling elements
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.componentName
 * Component containing JSX.
 *
 * @param {string} params.sourceElement
 * JSX element to move.
 *
 * Example:
 * "button"
 *
 * @param {string} params.destinationElement
 * JSX destination parent.
 *
 * Example:
 * "footer"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{ updatedCode: string }}
 * Updated source code.
 *
 */
function moveJSX(
  { code, componentName, sourceElement, destinationElement },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Store JSX node that will be moved
  // ----------------------------------------------------------

  let nodeToMove:
    | t.JSXElement
    | t.JSXFragment
    | t.JSXExpressionContainer
    | t.JSXSpreadChild
    | t.JSXText
    | null = null;

  // ----------------------------------------------------------
  // STEP 3:
  // Track movement completion
  // ----------------------------------------------------------

  let moved = false;

  // ----------------------------------------------------------
  // STEP 4:
  // Traverse AST searching target component
  // ----------------------------------------------------------

  traverse.default(ast, {
    FunctionDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated components
      // ------------------------------------------------------

      if (path.node.id?.name !== componentName) {
        return;
      }

      // ======================================================
      // PHASE 1:
      // FIND + REMOVE SOURCE ELEMENT
      // ======================================================

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Stop if source already found
          // --------------------------------------------------

          if (nodeToMove) {
            return;
          }

          // --------------------------------------------------
          // Get opening JSX element
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated JSX elements
          // --------------------------------------------------

          if (openingElement.name.name !== sourceElement) {
            return;
          }

          // --------------------------------------------------
          // Clone node before removal
          //
          // WHY?
          //
          // Removing node destroys original reference.
          // --------------------------------------------------

          nodeToMove = t.cloneNode(jsxPath.node, true);

          // --------------------------------------------------
          // Remove original JSX node
          // --------------------------------------------------

          jsxPath.remove();
        },
      });

      // ======================================================
      // PHASE 2:
      // INSERT INTO DESTINATION
      // ======================================================

      if (!nodeToMove) {
        return;
      }

      path.traverse({
        JSXElement(jsxPath) {
          // --------------------------------------------------
          // Stop if movement already completed
          // --------------------------------------------------

          if (moved) {
            return;
          }

          // --------------------------------------------------
          // Get opening JSX element
          // --------------------------------------------------

          const openingElement = jsxPath.node.openingElement;

          // --------------------------------------------------
          // Ignore unsupported tag types
          // --------------------------------------------------

          if (!t.isJSXIdentifier(openingElement.name)) {
            return;
          }

          // --------------------------------------------------
          // Ignore unrelated destination elements
          // --------------------------------------------------

          if (openingElement.name.name !== destinationElement) {
            return;
          }

          // --------------------------------------------------
          // Insert moved JSX inside destination
          //
          // BEFORE:
          //
          // <footer></footer>
          //
          // AFTER:
          //
          // <footer>
          //   <button />
          // </footer>
          // --------------------------------------------------

          if (nodeToMove) {
            jsxPath.node.children.push(t.jsxText("\n"), nodeToMove);
          }

          // --------------------------------------------------
          // Mark movement completed
          // --------------------------------------------------

          moved = true;

          // --------------------------------------------------
          // Stop traversal for safety/performance
          // --------------------------------------------------

          jsxPath.stop();
        },
      });
    },
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * DescriptionForPrompt: Inserts new CSS styles into a component style file.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function appends new css styles into:
 *
 * Component.css
 *
 * Example:
 *
 * BEFORE:
 *
 * .header {
 *   padding: 16px;
 * }
 *
 * AFTER:
 *
 * .header {
 *   padding: 16px;
 * }
 *
 * .header-title {
 *   color: red;
 * }
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma frequently needs to:
 *
 * - add new styles
 * - add responsive rules
 * - add hover effects
 * - add utility classes
 * - add animations
 *
 * Instead of replacing entire css file,
 * this function safely appends styles.
 * 
 * Useful in commands like:

make header red
add hover effect
add responsive styles
add animation
style this button
increase card padding
make navbar sticky

Usually called after:

ensureStyleFile()

Usually used before:

optimizeStyles()
formatStyles()
 *
 * ------------------------------------------------------------
 * IMPORTANT DESIGN DECISION
 * ------------------------------------------------------------
 *
 * This function:
 *
 * ONLY inserts styles.
 *
 * It does NOT:
 *
 * - update existing styles
 * - remove styles
 * - optimize styles
 * - merge selectors
 *
 * Those should be handled by separate tasks.
 *
 * ------------------------------------------------------------
 * DEPENDENCY
 * ------------------------------------------------------------
 *
 * This function assumes:
 *
 * ensureStyleFile()
 *
 * has already been executed.
 *
 * Meaning:
 *
 * css file already exists.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.cssPath
 * Path of css file.
 *
 * Example:
 *
 * "./src/components/Header/Header.css"
 *
 * @param {string} params.styles
 * CSS styles to insert.
 *
 * Example:
 *
 * `
 * .header-title {
 *   color: red;
 * }
 * `
 *
 * @param {boolean} [params.addNewLine=true]
 * Whether to insert spacing before styles.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   inserted: boolean,
 *   cssPath: string
 * }
 *
 */
// function insertStyles({ cssPath, styles, addNewLine = true }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Validate css file existence
//   // ----------------------------------------------------------

//   if (!fs.existsSync(cssPath)) {
//     throw new Error(`CSS file does not exist: ${cssPath}`);
//   }

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Read existing css content
//   // ----------------------------------------------------------

//   const existingCss = fs.readFileSync(cssPath, "utf8");

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Prepare final styles content
//   //
//   // Adds spacing before inserted styles
//   // for readability.
//   // ----------------------------------------------------------

//   const finalStyles = addNewLine ? `\n\n${styles}` : styles;

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Append styles to existing css
//   // ----------------------------------------------------------

//   const updatedCss = existingCss + finalStyles;

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Write updated css back to file
//   // ----------------------------------------------------------

//   fs.writeFileSync(cssPath, updatedCss, "utf8");

//   // ----------------------------------------------------------
//   // STEP 6:
//   // Return operation result
//   // ----------------------------------------------------------

//   return {
//     success: true,
//     cssPath,
//   };
// }

/**
 * Removes imports from a source/module.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function removes:
 *
 * - default imports
 * - named imports
 * - namespace imports
 *
 * from a specific source.
 *
 * ------------------------------------------------------------
 * IMPORTANT BEHAVIOR
 * ------------------------------------------------------------
 *
 * This function intelligently handles:
 *
 * 1) removing only a specific named import
 *
 * BEFORE:
 * import React, { useState, useEffect } from "react";
 *
 * AFTER:
 * import React, { useEffect } from "react";
 *
 * ------------------------------------------------------------
 *
 * 2) removing entire import declaration if empty
 *
 * BEFORE:
 * import { useState } from "react";
 *
 * AFTER:
 * <removed entirely>
 *
 * ------------------------------------------------------------
 *
 * 3) removing default import
 *
 * BEFORE:
 * import React from "react";
 *
 * AFTER:
 * <removed entirely>
 *
 * ------------------------------------------------------------
 *
 * 4) removing namespace import
 *
 * BEFORE:
 * import * as React from "react";
 *
 * AFTER:
 * <removed entirely>
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Imports are syntax structures.
 *
 * Using string replacement is fragile because:
 * - formatting changes break logic
 * - multiline imports become difficult
 * - commas/braces become error-prone
 *
 * AST manipulation is:
 * - deterministic
 * - formatting-safe
 * - syntax-aware
 *
 * ------------------------------------------------------------
 * EXAMPLES
 * ------------------------------------------------------------
 *
 * removeImport({
 *   code,
 *   source: "react",
 *   importName: "useState",
 *   importType: "named"
 * });
 *
 * ------------------------------------------------------------
 *
 * removeImport({
 *   code,
 *   source: "react",
 *   importType: "default"
 * });
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * @param {string} params.source
 * Import source/package.
 *
 * Example:
 * "react"
 * "./Header"
 *
 * @param {string=} params.importName
 * Required only for named imports.
 *
 * Example:
 * "useState"
 *
 * @param {"default"|"named"|"namespace"} params.importType
 * Type of import to remove.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{updatedCode: string}}
 * Updated source code.
 *
 */
function removeImport(
  { code, source, importName, importType },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  //
  // sourceType: "module"
  // enables ES module parsing
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Traverse AST looking for import declarations
  // ----------------------------------------------------------

  traverse.default(ast, {
    ImportDeclaration(path) {
      // ------------------------------------------------------
      // Ignore unrelated imports
      //
      // Example:
      //
      // import React from "react"
      //
      // source.value = "react"
      // ------------------------------------------------------

      if (path.node.source.value !== source) {
        return;
      }

      // ------------------------------------------------------
      // Get all import specifiers
      //
      // Example:
      //
      // import React, { useState } from "react"
      //
      // specifiers:
      // - ImportDefaultSpecifier
      // - ImportSpecifier
      // ------------------------------------------------------

      let specifiers = path.node.specifiers;

      // ======================================================
      // REMOVE DEFAULT IMPORT
      // ======================================================

      if (importType === "default") {
        // ----------------------------------------------------
        // Remove ImportDefaultSpecifier
        // ----------------------------------------------------

        specifiers = specifiers.filter(
          (specifier) => !t.isImportDefaultSpecifier(specifier),
        );
      }

      // ======================================================
      // REMOVE NAMED IMPORT
      // ======================================================

      if (importType === "named") {
        // ----------------------------------------------------
        // Remove matching named import
        //
        // BEFORE:
        // import { useState, useEffect }
        //
        // AFTER:
        // import { useEffect }
        // ----------------------------------------------------

        specifiers = specifiers.filter((specifier) => {
          // keep non-named specifiers
          if (!t.isImportSpecifier(specifier)) {
            return true;
          }

          // remove matching named import
          return (
            t.isIdentifier(specifier.imported) &&
            specifier.imported.name !== importName
          );
        });
      }

      // ======================================================
      // REMOVE NAMESPACE IMPORT
      // ======================================================

      if (importType === "namespace") {
        // ----------------------------------------------------
        // Remove namespace specifier
        //
        // import * as React from "react"
        // ----------------------------------------------------

        specifiers = specifiers.filter(
          (specifier) => !t.isImportNamespaceSpecifier(specifier),
        );
      }

      // ------------------------------------------------------
      // STEP 3:
      // If no specifiers remain:
      // remove entire import declaration
      //
      // Example:
      //
      // import React from "react"
      //
      // becomes:
      // <removed>
      // ------------------------------------------------------

      if (specifiers.length === 0) {
        path.remove();
        return;
      }

      // ------------------------------------------------------
      // STEP 4:
      // Otherwise update remaining specifiers
      // ------------------------------------------------------

      path.node.specifiers = specifiers;
    },
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * Ensures that an import exists in a file.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function guarantees that a specific import exists.
 *
 * If import already exists:
 * - enrich existing import declaration
 *
 * If import does not exist:
 * - create a new import declaration
 *
 * ------------------------------------------------------------
 * Useful commands
 * ------------------------------------------------------------
 * - add state: ensureImport(useState)
 * - add routing: ensureImport(BrowserRouter)
 * - add header component: ensureImport(Header)
 * - add animation: ensureImport(motion)
 * - use useEffect: ensureImport(useEffect)
 * - add icons: ensureImport(Menu)
 *
 * ------------------------------------------------------------
 * WHY "ENSURE" IS IMPORTANT
 * ------------------------------------------------------------
 *
 * A naive system blindly inserts imports:
 *
 * import React from "react";
 * import { useState } from "react";
 *
 * Over time this causes:
 * - duplicate imports
 * - fragmented imports
 * - unstable formatting
 *
 * ensureImport prevents this problem.
 *
 * ------------------------------------------------------------
 * EXAMPLE
 * ------------------------------------------------------------
 *
 * ensureImport({
 *   code,
 *   source: "react",
 *   importName: "useState",
 *   importType: "named"
 * });
 *
 * RESULT:
 *
 * import React, { useState } from "react";
 *
 * ------------------------------------------------------------
 * SUPPORTED IMPORT TYPES
 * ------------------------------------------------------------
 *
 * default:
 * import React from "react";
 *
 * named:
 * import { useState } from "react";
 *
 * namespace:
 * import * as React from "react";
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code of file.
 *
 * @param {string} params.source
 * Import source/package.
 *
 * Example:
 * "react"
 * "./Header"
 *
 * @param {string} params.importName
 * Name of imported symbol.
 *
 * Example:
 * "useState"
 * "React"
 *
 * @param {"default"|"named"|"namespace"} params.importType
 * Type of import.
 *
 * @param {string=} params.alias
 * Optional alias name.
 *
 * Example:
 * import { useState as customState }
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{updatedCode: string}}
 * Updated source code.
 *
 */
function ensureImport(
  { code, source, importName, importType, alias },
  context: ExecutionContext,
) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  //
  // WHY?
  //
  // AST lets us manipulate imports safely instead of using
  // fragile string replacement.
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Track whether matching source import already exists
  //
  // Example:
  //
  // import React from "react"
  //
  // sourceExists -> true
  // ----------------------------------------------------------

  let sourceExists = false;

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST to search existing imports
  // ----------------------------------------------------------

  traverse.default(ast, {
    ImportDeclaration(path) {
      // ------------------------------------------------------
      // Compare import source
      //
      // Example:
      //
      // import React from "react"
      //                     ^^^^^^^
      // ------------------------------------------------------

      if (path.node.source.value === source) {
        sourceExists = true;
      }
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // If source import already exists:
  // enrich existing import declaration
  //
  // Example:
  //
  // BEFORE:
  // import React from "react";
  //
  // AFTER:
  // import React, { useState } from "react";
  // ----------------------------------------------------------

  if (sourceExists) {
    let modified = false;
    traverse.default(ast, {
      ImportDeclaration(path) {
        if (path.node.source.value !== source) return;

        const specifiers = path.node.specifiers;

        // =========================
        // DEFAULT IMPORT
        // import React from "react"
        // =========================
        if (importType === "default") {
          const hasDefault = specifiers.some((s) =>
            t.isImportDefaultSpecifier(s),
          );

          if (!hasDefault) {
            specifiers.unshift(
              t.importDefaultSpecifier(t.identifier(alias || importName)),
            );

            modified = true;
          }
        }

        // =========================
        // NAMED IMPORT
        // import { useState } from "react"
        // =========================
        if (importType === "named") {
          // namespace import already covers all
          const hasNamespace = specifiers.some((s) =>
            t.isImportNamespaceSpecifier(s),
          );

          if (hasNamespace) return;

          const hasNamed = specifiers.some(
            (s) =>
              t.isImportSpecifier(s) &&
              t.isIdentifier(s.imported) &&
              s.imported.name === importName,
          );

          if (!hasNamed) {
            specifiers.push(
              t.importSpecifier(
                t.identifier(alias || importName),
                t.identifier(importName),
              ),
            );

            modified = true;
          }
        }

        // =========================
        // NAMESPACE IMPORT
        // import * as React from "react"
        // =========================
        if (importType === "namespace") {
          const hasNamespace = specifiers.some((s) =>
            t.isImportNamespaceSpecifier(s),
          );

          if (!hasNamespace) {
            path.node.specifiers = [
              t.importNamespaceSpecifier(t.identifier(alias || importName)),
            ];

            modified = true;
          }
        }
      },
    });

    if (!modified) return { success: true, updatedCode: code };

    return { success: true, updatedCode: generate(ast).code };
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Create import specifier based on import type
  //
  // Different import types require different AST nodes.
  // ----------------------------------------------------------

  let specifier;

  // ----------------------------------------------------------
  // DEFAULT IMPORT
  //
  // import React from "react"
  // ----------------------------------------------------------

  if (importType === "default") {
    specifier = t.importDefaultSpecifier(t.identifier(alias || importName));
  }

  // ----------------------------------------------------------
  // NAMED IMPORT
  //
  // import { useState } from "react"
  // ----------------------------------------------------------

  if (importType === "named") {
    specifier = t.importSpecifier(
      t.identifier(alias || importName),
      t.identifier(importName),
    );
  }

  // ----------------------------------------------------------
  // NAMESPACE IMPORT
  //
  // import * as React from "react"
  // ----------------------------------------------------------

  if (importType === "namespace") {
    specifier = t.importNamespaceSpecifier(t.identifier(alias || importName));
  }

  // ----------------------------------------------------------
  // STEP 6:
  // Create new ImportDeclaration AST node
  // ----------------------------------------------------------

  const importDeclaration = t.importDeclaration(
    [specifier],
    t.stringLiteral(source),
  );

  // ----------------------------------------------------------
  // STEP 7:
  // Insert import at top of file
  //
  // unshift():
  // inserts at beginning of array
  // ----------------------------------------------------------

  ast.program.body.unshift(importDeclaration);

  // ----------------------------------------------------------
  // STEP 8:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

/**
 * Removes unused imports from a file.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function analyzes the entire file and removes imports
 * that are not used anywhere in the code.
 *
 * It supports:
 *
 * - default imports
 * - named imports
 * - namespace imports
 *
 * ------------------------------------------------------------
 * EXAMPLE
 * ------------------------------------------------------------
 *
 * BEFORE:
 *
 * import React from "react";
 * import { useState, useEffect } from "react";
 *
 * function App() {
 *   const [count] = useState(0);
 *   return <div>{count}</div>;
 * }
 *
 * AFTER:
 *
 * import { useState } from "react";
 *
 * function App() {
 *   const [count] = useState(0);
 *   return <div>{count}</div>;
 * }
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION IS IMPORTANT
 * ------------------------------------------------------------
 *
 * During automatic code generation:
 *
 * - components get deleted
 * - hooks get removed
 * - JSX gets replaced
 *
 * which leaves behind:
 *
 * - dead imports
 * - duplicate imports
 * - stale imports
 *
 * optimizeImports cleans the file afterward.
 *
 * Useful commands:
 * - clear it: removes stale imports after JSX cleanup
 * - remove header: removes unused Header import
 * - remove useEffect: removes dead hook imports
 * - replace navbar: cleans obsolete imports afterward
 * - delete chart section: removes unused chart imports
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * This function should usually run AFTER:
 *
 * - removeJSX
 * - deleteComponent
 * - updateFunction
 * - removeImport
 * - replaceJSX
 *
 * It acts as a cleanup/sanitization pass.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * This is a lightweight AST-based optimizer.
 *
 * It checks identifier usage inside the current file only.
 *
 * It does NOT:
 * - understand runtime usage
 * - understand dynamic imports
 * - understand string-based references
 * - understand reflection/meta-programming
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Entire source code.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{updatedCode: string}}
 * Updated optimized code.
 *
 */
function optimizeImports({ code }, context: ExecutionContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse code into AST
  //
  // WHY?
  //
  // AST lets us safely analyze:
  // - imports
  // - identifiers
  // - JSX usage
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 2:
  // Store all identifiers actually used in file
  //
  // Example:
  //
  // useState
  // Header
  // React
  // ----------------------------------------------------------

  const usedIdentifiers = new Set();

  // ----------------------------------------------------------
  // STEP 3:
  // Traverse AST and collect identifier usage
  // ----------------------------------------------------------

  traverse.default(ast, {
    Identifier(path) {
      // ------------------------------------------------------
      // Ignore identifiers inside import declarations
      //
      // Example:
      //
      // import React from "react"
      //
      // "React" here should NOT count as usage
      // ------------------------------------------------------

      if (path.parent.type === "ImportSpecifier") {
        return;
      }

      if (path.parent.type === "ImportDefaultSpecifier") {
        return;
      }

      if (path.parent.type === "ImportNamespaceSpecifier") {
        return;
      }

      // ------------------------------------------------------
      // Add identifier name to used set
      // ------------------------------------------------------

      usedIdentifiers.add(path.node.name);
    },

    // --------------------------------------------------------
    // JSX identifiers are separate from normal identifiers
    //
    // Example:
    //
    // <Header />
    //
    // Header is JSXIdentifier
    // --------------------------------------------------------

    JSXIdentifier(path) {
      // ------------------------------------------------------
      // Ignore native HTML tags
      //
      // div
      // button
      // span
      // ------------------------------------------------------

      const isNativeTag = path.node.name[0] === path.node.name[0].toLowerCase();

      if (isNativeTag) {
        return;
      }

      // ------------------------------------------------------
      // Track JSX component usage
      // ------------------------------------------------------

      usedIdentifiers.add(path.node.name);
    },
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Traverse imports and remove unused specifiers
  // ----------------------------------------------------------

  traverse.default(ast, {
    ImportDeclaration(path) {
      // ------------------------------------------------------
      // Filter import specifiers
      // ------------------------------------------------------

      const remainingSpecifiers = path.node.specifiers.filter((specifier) => {
        // ==================================================
        // DEFAULT IMPORT
        // ==================================================

        if (t.isImportDefaultSpecifier(specifier)) {
          return usedIdentifiers.has(specifier.local.name);
        }

        // ==================================================
        // NAMED IMPORT
        // ==================================================

        if (t.isImportSpecifier(specifier)) {
          return usedIdentifiers.has(specifier.local.name);
        }

        // ==================================================
        // NAMESPACE IMPORT
        // ==================================================

        if (t.isImportNamespaceSpecifier(specifier)) {
          return usedIdentifiers.has(specifier.local.name);
        }

        return true;
      });

      // ------------------------------------------------------
      // If no imports remain:
      // remove entire import declaration
      // ------------------------------------------------------

      if (remainingSpecifiers.length === 0) {
        path.remove();
        return;
      }

      // ------------------------------------------------------
      // Otherwise update remaining imports
      // ------------------------------------------------------

      path.node.specifiers = remainingSpecifiers;
    },
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return { success: true, updatedCode: generate(ast).code };
}

function updateImportSource({ code, oldSource, newSource }) {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse code into AST
  //
  // WHY?
  //
  // AST lets us safely analyze:
  // - imports
  // - identifiers
  // - JSX usage
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  traverse.default(ast, {
    ImportDeclaration(path) {
      if (path.node.source.value === oldSource) {
        path.node.source.value = newSource;
      }
    },
  });

  return { success: true, updatedCode: generate(ast).code };
}

export default {
  insertJSX,
  replaceJSX,
  removeJSX,
  moveJSX,
  wrapJSX,

  // expose only when planner becomes mature enough to use it directly
  insertVariable,
  updateVariable,
  deleteVariable,
  removeImport,
  ensureImport,
  optimizeImports,
  updateImportSource,

  // createFunction,
  // updateFunction,
  // deleteFunction,

  // do not expose
  // generateClassNames,
  // syncComponentStyles,

  // resolveCssClassConflicts,
};
