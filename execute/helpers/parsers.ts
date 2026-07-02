import fs from "fs";
import traverse from "@babel/traverse";
import { parse } from "@babel/parser";
import t from "@babel/types";
import postcss from "postcss";

import { ERROR_CODES } from "../../schemas/index.js";
import type {
  TaskPayload,
  TaskReturn,
  TaskResponse,
} from "../../schemas/index.js";

import { LoomaError } from "../../server/error.js";

/**
 * Parses JavaScript/TypeScript/JSX source code into AST.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function converts source code text into:
 *
 * AST (Abstract Syntax Tree)
 *
 * Example:
 *
 * INPUT:
 *
 * function sum(a, b) {
 *   return a + b;
 * }
 *
 * OUTPUT:
 *
 * Program
 *   └── FunctionDeclaration
 *         └── Identifier(sum)
 *
 * ------------------------------------------------------------
 * WHAT IS AST?
 * ------------------------------------------------------------
 *
 * AST = structural representation of code.
 *
 * Instead of manipulating raw strings,
 * tools manipulate syntax nodes safely.
 *
 * Example:
 *
 * Code:
 *
 * const x = 10;
 *
 * becomes:
 *
 * VariableDeclaration
 *   └── VariableDeclarator
 *         └── Identifier(x)
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Almost every intelligent code transformation requires AST.
 *
 * Example operations:
 *
 * - insert imports
 * - update variables
 * - create components
 * - manipulate JSX
 * - optimize imports
 * - refactor functions
 *
 * ALL depend on parsing source code first.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * parseAST is:
 *
 * INTERNAL ONLY
 *
 * It should NOT be exposed directly as user task.
 *
 * WHY?
 *
 * Users never say:
 *
 * "parse this AST"
 *
 * Instead they say:
 *
 * "add button"
 * "remove import"
 * "create component"
 *
 * Higher-level primitives internally use parseAST.
 *
 * ------------------------------------------------------------
 * WHY AST IS BETTER THAN STRING MANIPULATION
 * ------------------------------------------------------------
 *
 * String manipulation breaks easily.
 *
 * Problems:
 *
 * - formatting differences
 * - nested JSX
 * - multiline code
 * - syntax ambiguity
 * - duplicate names
 *
 * AST guarantees:
 *
 * - syntax-aware transformations
 * - deterministic edits
 * - valid output generation
 *
 * ------------------------------------------------------------
 * SUPPORTED CODE TYPES
 * ------------------------------------------------------------
 *
 * Current parser supports:
 *
 * - JavaScript
 * - JSX
 * - TypeScript
 * - TSX
 *
 * via Babel plugins.
 *
 * ------------------------------------------------------------
 * PARSER PLUGINS
 * ------------------------------------------------------------
 *
 * jsx
 * → enables React JSX parsing
 *
 * typescript
 * → enables TS/TSX parsing
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - assumes modern JS syntax
 *
 * Future improvements:
 *
 * - decorators
 * - class properties
 * - import assertions
 * - pipeline operators
 * - custom parser plugins
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.code
 * Source code string.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {object}
 * Babel AST object.
 *
 */
function parseAST({ code }: TaskPayload<"parseAST">): TaskReturn<"parseAST"> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  //
  // sourceType: "module"
  //
  // enables:
  //
  // import/export parsing.
  //
  // plugins:
  //
  // jsx
  // → React JSX support
  //
  // typescript
  // → TS/TSX support
  // ----------------------------------------------------------

  try {
    return parse(code, {
      sourceType: "module",
      plugins: ["jsx", "typescript"],
    });
  } catch (error) {
    throw new LoomaError(
      ERROR_CODES.PARSE_ERROR,
      `AST parsing failed: ${error.message}`,
    );
  }
}

/**
 * Parses CSS into a structured AST representation.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function converts raw CSS code into:
 *
 * CSS AST (Abstract Syntax Tree)
 *
 * using:
 *
 * PostCSS
 *
 * Example:
 *
 * INPUT:
 *
 * .header {
 *   color: red;
 * }
 *
 * OUTPUT:
 *
 * {
 *   type: "root",
 *   nodes: [...]
 * }
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * String replacement becomes dangerous
 * as CSS complexity grows.
 *
 * Example problems:
 *
 * - nested media queries
 * - duplicate selectors
 * - partial replacements
 * - malformed css
 * - accidental deletions
 *
 * AST parsing allows:
 *
 * - safe css mutations
 * - selector analysis
 * - declaration traversal
 * - style refactoring
 * - advanced css tooling
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should eventually perform:
 *
 * ALL CSS OPERATIONS
 *
 * using AST transformations.
 *
 * NOT regex.
 *
 * Regex-based CSS editing breaks
 * at scale.
 *
 * This function is foundational
 * infrastructure for that transition.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - insertStyles()
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
 * - "update responsive styles"
 * - "rename css class"
 * - "remove unused styles"
 * - "extract component"
 * - "optimize css"
 * - "convert to dark mode"
 *
 * It is usually used BEFORE:
 *
 * - advanced css mutations
 * - css analysis
 * - selector synchronization
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * This function ONLY parses CSS.
 *
 * It does NOT:
 *
 * - modify css
 * - optimize css
 * - write files
 *
 * It only converts CSS:
 *
 * text
 * →
 * AST
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
 * @param {string} [params.cssCode]
 * Raw css code.
 *
 * OR
 *
 * @param {string} [params.cssPath]
 * Path to css file.
 *
 * One of:
 *
 * - cssCode
 * - cssPath
 *
 * is required.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {Object}
 *
 * {
 *   ast,
 *   cssCode
 * }
 *
 */
function parseCSS({
  cssCode,
  cssPath,
}: TaskPayload<"parseCSS">): TaskResponse<TaskReturn<"parseCSS">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Validate input
  // ----------------------------------------------------------

  if (!cssCode && !cssPath) {
    throw new LoomaError(
      ERROR_CODES.PARSE_ERROR,
      "Either cssCode or cssPath is required",
    );
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Read css file if path provided
  // ----------------------------------------------------------

  if (cssPath) {
    // --------------------------------------------------------
    // Validate css file existence
    // --------------------------------------------------------

    if (!fs.existsSync(cssPath)) {
      throw new LoomaError(
        ERROR_CODES.FILE_NOT_FOUND,
        `CSS file does not exist: ${cssPath}`,
      );
    }

    // --------------------------------------------------------
    // Read css content
    // --------------------------------------------------------

    cssCode = fs.readFileSync(cssPath, "utf8");
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Parse css using PostCSS
  //
  // Converts:
  //
  // raw css
  // →
  // AST
  // ----------------------------------------------------------

  const ast = postcss.parse(cssCode);

  // ----------------------------------------------------------
  // STEP 4:
  // Return parsed result
  // ----------------------------------------------------------

  return {
    success: true,
    ast,
    cssCode,
  };
}

/**
   * Parses React Router routes from AST.
   * 
   * returns 
   * {
        success: true,
        routes: [ {}, { path: 'step-2' }, { path: 'step-3' } ]
      }
   * 
   */
function parseRoutes({ ast }) {
  const routes = [];

  traverse.default(ast, {
    JSXElement(path) {
      const openingElement = path.node.openingElement;

      if (
        t.isJSXIdentifier(openingElement.name) &&
        openingElement.name.name === "Route"
      ) {
        const route = {};

        openingElement.attributes.forEach((attr) => {
          if (attr.type !== "JSXAttribute") {
            return;
          }

          const name = attr.name.name;

          if (attr.value && attr.value.type === "StringLiteral") {
            if (typeof name === "string") {
              route[name] = attr.value.value;
            }
          }
        });

        routes.push(route);
      }
    },
  });

  if (routes.length === 0) {
    return { success: false, message: "No react route found." };
  }

  return { success: true, routes };
}
/**
   * returns all the imports of a component like this
   * 
   * [
        { localName: 'useState', source: 'react' },
        { localName: 'useEffect', source: 'react' },
        { localName: 'reactLogo', source: '../../assets/react.svg' },
        { localName: 'viteLogo', source: '/vite.svg' },
        { localName: 'Header', source: './Header' }
      ]
   * 
   */
function parseComponentDependencies({ ast }) {
  const dependencies: any = [];

  traverse.default(ast, {
    ImportDeclaration(path) {
      const source = path.node.source.value;

      path.node.specifiers.forEach((specifier) => {
        dependencies.push({
          localName: specifier.local.name,
          source,
        });
      });
    },
  });

  return { success: true, dependencies };
}
/**
 * Parses component props usage.
 */
function parseProps({ ast }) {
  const props: any = new Set();

  traverse.default(ast, {
    MemberExpression(path) {
      if (
        t.isIdentifier(path.node.object) &&
        path.node.object.name === "props"
      ) {
        if (t.isIdentifier(path.node.property)) {
          props.add(path.node.property.name);
        }
      }
    },

    ObjectPattern(path) {
      path.node.properties.forEach((property) => {
        if (property.type === "ObjectProperty") {
          if (property.key && property.key.type === "Identifier") {
            props.add(property.key.name);
          }
        }
      });
    },
  });

  return { success: true, props: [...props] };
}
// /**
//  * Parses useState usage.
//  */
// function parseStateUsage(
//   ast: TaskPayload<"parseStateUsage">
// ): TaskResponse<TaskReturn<"parseStateUsage">> {
//   const states = [];

//   traverse.default(ast, {
//     VariableDeclarator(path) {
//       const init = path.node.init;

//       if (
//         init &&
//         init.type === "CallExpression" &&
//         init.callee.name === "useState"
//       ) {
//         const elements = path.node.id.elements;

//         states.push({
//           state: elements?.[0]?.name,
//           setter: elements?.[1]?.name,
//         });
//       }
//     },
//   });

//   return states;
// }
// /**
//  * Parses JSX event handlers.
//  */
// function parseEventHandlers(
//   ast: TaskPayload<"parseEventHandlers">
// ): TaskResponse<TaskReturn<"parseEventHandlers">> {
//   const handlers = [];

//   traverse.default(ast, {
//     JSXAttribute(path) {
//       const name = path.node.name.name;

//       if (!name.startsWith("on")) {
//         return;
//       }

//       const expression = path.node.value?.expression;

//       handlers.push({
//         event: name,
//         handler: expression?.name,
//       });
//     },
//   });

//   return handlers;
// }

/**
 * Parses fetch and axios API calls.
 */
// function parseAPICalls(
//   ast: TaskPayload<"parseEventHandlers">
// ): TaskResponse<TaskReturn<"parseAPICalls">> {
//   const calls = [];

//   traverse.default(ast, {
//     CallExpression(path) {
//       const callee = path.node.callee;

//       if (callee.name === "fetch") {
//         calls.push({
//           type: "fetch",
//         });
//       }

//       if (callee.object?.name === "axios") {
//         calls.push({
//           type: "axios",
//           method: callee.property.name,
//         });
//       }
//     },
//   });

//   return calls;
// }

/**
 * Parses TypeScript interfaces and types.
 */
// function parseTypescriptTypes(
//   ast: TaskPayload<"parseTypescriptTypes">
// ): TaskResponse<TaskReturn<"parseTypescriptTypes">> {
//   const types = [];

//   traverse.default(ast, {
//     TSInterfaceDeclaration(path) {
//       types.push({
//         type: "interface",
//         name: path.node.id.name,
//       });
//     },

//     TSTypeAliasDeclaration(path) {
//       types.push({
//         type: "alias",
//         name: path.node.id.name,
//       });
//     },
//   });

//   return types;
// }

/**
 * Parses module exports.
 *
 * returns
 * { success: true, exportsList: [ 'default' ] }
 *
 */
function parseExports({ ast }) {
  const exportsList = [];

  traverse.default(ast, {
    ExportNamedDeclaration(path) {
      path.node.specifiers.forEach((specifier) => {
        if (t.isIdentifier(specifier.exported)) {
          exportsList.push(specifier.exported.name);
        }
      });
    },

    ExportDefaultDeclaration(path) {
      exportsList.push("default");
    },
  });

  return { success: true, exportsList };
}

/**
 * Parses React hooks usage.
 */
function parseHooksUsage({ ast }) {
  const hooks = [];

  traverse.default(ast, {
    CallExpression(path) {
      const callee = path.node.callee;

      if (t.isIdentifier(callee) && callee.name.startsWith("use")) {
        hooks.push(callee.name);
      }
    },
  });

  return [...new Set(hooks)];
}

/**
 * Parses JSX DOM hierarchy.
 */
// function parseDOMHierarchy(
//   ast: TaskPayload<"parseDOMHierarchy">
// ): TaskResponse<TaskReturn<"parseDOMHierarchy">> {
//   function parseElement(node) {
//     if (node.type !== "JSXElement") {
//       return null;
//     }

//     return {
//       tag: node.openingElement.name.name,
//       children: node.children.map(parseElement).filter(Boolean),
//     };
//   }

//   let tree = null;

//   traverse.default(ast, {
//     ReturnStatement(path) {
//       const argument = path.node.argument;

//       if (argument?.type === "JSXElement") {
//         tree = parseElement(argument);
//       }
//     },
//   });

//   return tree;
// }

function parseSelector(selector) {
  // ----------------------------------------------------------
  // Extract attribute selectors
  //
  // div.card[data-id="123"][role="button"]
  // ----------------------------------------------------------

  const attributeRegex = /\[([^\]=]+)=['"]?([^'"\]]+)['"]?\]/g;

  const attributes = {};

  let match;

  while ((match = attributeRegex.exec(selector)) !== null) {
    const [, key, value] = match;

    attributes[key] = value;
  }

  // ----------------------------------------------------------
  // Remove attribute section
  //
  // div.card[data-id="123"]
  // ↓
  // div.card
  // ----------------------------------------------------------

  const selectorWithoutAttributes = selector.replace(attributeRegex, "");

  // ----------------------------------------------------------
  // Extract tag and classes
  //
  // div.card.primary
  // ----------------------------------------------------------

  const [tagName, ...classes] = selectorWithoutAttributes.split(".");

  return {
    tagName,
    classes,
    attributes,
  };
}

/*
  parseJSCode returns
  returns {
    "imports": [
      "react",
      "react",
      "../../assets/react.svg",
      "/vite.svg",
      "./App.css",
      "./Header"
    ],
    "exports": ["default"],
    "components": [],
    "functions": [
      { "name": "button", "line": [8, 10] },
      { "name": "App", "line": [11, 32] }
    ],
    "variables": [{ "name": "button", "line": [8, 10] }, { "line": [12, 12] }]
  }
  */
function parseJSCode({ code }) {
  const ast = parse(code, {
    sourceType: "module",
    plugins: [
      "jsx",
      // "typescript",
      // "classProperties",
      // "topLevelAwait",
      // "objectRestSpread"
    ],
  });

  const info = {
    imports: [],
    exports: [],
    components: [],
    functions: [],
    variables: [],
  };

  traverse.default(ast, {
    ImportDeclaration({ node }) {
      info.imports.push(node.source.value);
    },
    ExportNamedDeclaration({ node }) {
      if (
        node.declaration &&
        "id" in node.declaration &&
        t.isIdentifier(node.declaration.id)
      ) {
        info.exports.push(node.declaration.id.name);
      }
    },
    ExportDefaultDeclaration({ node }) {
      info.exports.push("default");
    },
    FunctionDeclaration({ node }) {
      if (node.id?.name) {
        info.functions.push({
          name: node.id.name,
          line: [node.loc.start.line, node.loc.end.line],
        });
      }
    },
    VariableDeclaration({ node }) {
      node.declarations.forEach((decl) => {
        const name = t.isIdentifier(decl.id) ? decl.id.name : undefined;
        const line = [decl.loc.start.line, decl.loc.end.line];

        // Arrow function components (already handled)
        if (
          decl.init?.type === "ArrowFunctionExpression" &&
          (decl.init.body.type === "JSXElement" ||
            decl.init.body.type === "BlockStatement")
        ) {
          info.functions.push({ name, line });
        }

        // All variables, regardless of initializer
        info.variables = info.variables || [];
        info.variables.push({ name, line });
      });
    },
  });

  return info;
}

function parseLLMJsonResponse(response: string) {
  try {
    return JSON.parse(response);
  } catch {
    try {
      const extractedData = extractJSONFromLLM(response);

      // CRITICAL FIX: You must explicitly return the extracted data here
      return extractedData;
    } catch (error) {
      throw new LoomaError(
        ERROR_CODES.LLM_INVALID_RESPONSE,
        "LLM's response in invalid JSON",
        {
          response,
          originalError: error instanceof Error ? error.message : String(error),
        },
      );
    }
  }
}

function extractJSONFromLLM(llmResponse) {
  try {
    // 1. Clean markdown code blocks if present
    let cleanedText = llmResponse
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 2. Use regex to find the first '{' or '[' and the last '}' or ']'
    const jsonMatch = cleanedText.match(/[\{\[]([\s\S]*?)[\}\]]/);

    if (!jsonMatch) {
      throw new Error("No JSON structure found in the response.");
    }

    // Extract the matched substring including the outer brackets
    const jsonString = jsonMatch[0];

    // 3. Attempt to parse the extracted string
    return JSON.parse(jsonString);
  } catch (firstError) {
    // 4. Fallback: Heavy cleaning for common LLM syntax errors
    try {
      const sanitized = repairLLMJsonString(llmResponse);
      return JSON.parse(sanitized);
    } catch (secondError) {
      throw new Error(
        `Failed to parse LLM JSON. Original error: ${firstError.message}`,
      );
    }
  }
}

function repairLLMJsonString(text) {
  // Isolate the text between first '{' and last '}'
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1) throw new Error("Brackets missing");

  let jsonStr = text.substring(start, end + 1);

  // Strip trailing commas before closing braces/brackets
  jsonStr = jsonStr.replace(/,\s*([\]\}])/g, "$1");

  return jsonStr;
}

export default {
  parseAST,
  parseCSS,
  parseRoutes,
  parseComponentDependencies,
  parseProps,
  // parseTypescriptTypes,
  parseExports,
  parseJSCode,
  parseHooksUsage,
  parseSelector,
  // parseStateUsage,
  // parseEventHandlers,
  // parseAPICalls,
  // parseDOMHierarchy,

  parseLLMJsonResponse,
};
