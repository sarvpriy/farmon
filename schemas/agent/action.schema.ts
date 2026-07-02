import * as z from "zod";

export const HelpersTaskRegistry = {
  // insertCode: {
  //   description: "insertCode",
  //   payload: z.object({
  //     filePath: z.string(),
  //     codeToInsert: z.string(),
  //     insertAt: "end",
  //   }),

  //   return: z.object({
  //     success: z.boolean(),
  //     filePath: z.string(),
  //     insertAt: z.string(),
  //   }),
  // },

  // enrichImport: {
  //   payload: z.unknown(),
  //   return: z.unknown(),
  // },

  ensureLibrary: {
    description: "ensureLibrary",
    payload: z.object({
      projectPath: z.string(),
      libraryName: z.string(),
      version: z.string(),
      dependencyType: "dependencies",
    }),

    return: z.object({ success: z.boolean(), packageJson: z.object() }),
  },

  ensureComponentStructure: {
    description: "ensureComponentStructure",
    payload: z.object({
      componentPath: z.string(),
      componentName: z.string(),
      ensureCss: z.boolean(),
      ensureIndex: z.boolean(),
      createIfMissing: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      existing: z.array(z.string()),
      repaired: z.boolean(),
    }),
  },

  normalizeComponent: {
    description: "normalizeComponent",
    payload: z.object({
      componentPath: z.string(),
      componentName: z.string(),
      ensureCss: z.boolean(),
      ensureIndex: z.boolean(),
      normalizeExports: z.boolean(),
    }),

    return: z.object({ repairedItems: z.unknown(), warnings: z.unknown() }),
  },

  findComponentDirectory: {
    description: "findComponentDirectory",
    payload: z.object({
      componentName: z.string(),
      caseSensitive: z.optional(z.boolean()),
      returnFirst: z.optional(z.boolean()),
    }),

    return: z.union([
      z.object({
        foundComponent: {
          componentName: z.string(),
          componentPath: z.string(),
          jsxPath: z.string(),
          cssPath: z.string(),
          exists: z.boolean(),
        },
      }),
      z.object({ message: z.string() }),
    ]),
  },

  // inferComponentName: {
  //  "//",description:
  // payload: z.object({
  //     userInput: z.string(),
  //     filePath: z.string(),
  //     jsxCode: z.string(),
  //     stopWords: [
  //       "make",
  //       "update",
  //       "delete",
  //       "move",
  //       "rename",
  //       "extract",
  //       "component",
  //       "section",
  //       "add",
  //       "remove",
  //       "create",
  //       "change",
  //       "modify",
  //       "the",
  //       "a",
  //       "an"
  //     ],
  //   },

  //   return: z.object({
  //     componentName: z.string(),
  //     inferredFrom:
  //       | "jsx-function"
  //       | "jsx-arrow-function"
  //       | "file-path"
  //       | "user-input"
  //       | "fallback",
  //   },
  // },

  ensureStyleFile: {
    description: "ensureStyleFile",
    payload: z.object({
      componentPath: z.string(),
      componentName: z.string(),
      initialStyles: "",
    }),

    return: z.object({ success: z.boolean(), cssPath: z.string() }),
  },

  findCssSelector: {
    description: "findCssSelector",
    payload: z.object({
      ast: z.unknown(),
      selector: z.string(),
      findAll: z.boolean(),
    }),

    return: z.union([
      z.object({ success: z.boolean(), matches: z.array(z.string()) }),
      z.object({ success: z.boolean(), message: z.string() }),
    ]),
  },

  resolveStyleDependencies: {
    description: "resolveStyleDependencies",
    payload: z.object({
      cssPath: z.string(),
      availableDependencyFiles: z.unknown(),
      autoImport: z.boolean(),
    }),

    return: z.object({
      resolvedDependencies: z.unknown(),
      missingDependencies: z.unknown(),
      insertedImports: z.unknown(),
    }),
  },

  parseAST: {
    description: "parseAST",
    payload: z.object({
      code: z.string(),
    }),

    return: z.unknown(),
  },

  parseCSS: {
    description: "parseCSS",
    payload: z.object({
      cssCode: z.string(),
      cssPath: z.string(),
    }),

    return: z.object({ ast: z.unknown(), cssCode: z.string() }),
  },

  parseRoutes: {
    description: "parseRoutes",
    payload: z.object({ ast: z.unknown() }),

    return: z.union([
      z.object({ routes: z.unknown() }),
      z.object({ message: z.string() }),
    ]),
  },

  parseComponentDependencies: {
    description: "parseComponentDependencies",
    payload: z.object({ ast: z.string() }),

    return: z.object({
      dependencies: { localName: z.string(), source: z.string() },
    }),
  },

  parseProps: {
    description: "parseProps",
    payload: z.object({ ast: z.string() }),

    return: z.object({ props: z.array(z.string()) }),
  },

  // parseStateUsage: {
  //   payload: z.string(),

  //   return: z.unknown(),
  // },

  // parseEventHandlers: {
  //   payload: z.string(),

  //   return: z.unknown(),
  // },

  // parseAPICalls: {
  //   payload: z.string(),

  //   return: z.unknown(),
  // },

  // parseTypescriptTypes: {
  //   payload: z.string(),

  //   return: z.unknown(),
  // },

  parseExports: {
    description: "parseExports",
    payload: z.object({ ast: z.string() }),

    return: z.object({ exportsList: z.unknown() }),
  },

  parseHooksUsage: {
    description: "parseHooksUsage",
    payload: z.object({ ast: z.string() }),

    return: z.unknown(),
  },

  // parseDOMHierarchy: {
  //   payload: z.string(),

  //   return: z.unknown(),
  // },

  // matchesSelector: {
  //   description: "matchesSelector",
  //   payload: z.object({ openingElement: z.unknown(), selector: z.string() }),

  //   return: z.boolean(),
  // },

  generateCodeFromAST: {
    description: "generateCodeFromAST",
    payload: z.object({
      ast: z.string(),
      options: z.object(),
    }),

    return: z.string(),
  },

  findImportDeclaration: {
    description: "findImportDeclaration",
    payload: z.object({ ast: z.unknown(), source: z.string() }),

    return: z.object(),
  },

  buildImportDeclaration: {
    description: "buildImportDeclaration",
    payload: z.object({
      source: z.string(),
      defaultImport: z.string(),
      namedImports: z.unknown(),
      namespaceImport: z.unknown(),
    }),

    return: z.object(),
  },

  getImportSpecifiers: {
    description: "getImportSpecifiers",
    payload: z.object({
      importDeclaration: z.unknown(),
    }),

    return: z.object({
      defaultImport: z.union([z.string(), z.null()]),
      namespaceImport: z.union([z.string(), z.null()]),
      namedImports: z.array(z.string()),
    }),
  },

  removeImportSpecifier: {
    description: "removeImportSpecifier",
    payload: z.object({
      importDeclaration: z.unknown(),
      name: z.string(),
    }),

    return: z.unknown(),
  },

  mergeImportDeclarations: {
    description: "mergeImportDeclarations",
    payload: z.object({
      targetImport: z.unknown(),
      sourceImport: z.unknown(),
    }),

    return: z.unknown(),
  },

  isImportUsed: {
    description: "isImportUsed",
    payload: z.object({
      ast: z.unknown(),
      name: z.string(),
    }),

    return: z.boolean(),
  },

  // Mutation tasks

  // AST tasks
} as const;

export const GenerationTaskRegistry = {
  // generateComponentCode: {
  //   description: "generate component code",
  //   payload: z.object({
  //     prompt: z.string(),
  //   }),

  //   return: z.object({
  //     componentName: z.string(),
  //     componentCode: z.string(), // usageSnippet: "<Header />", },
  //   }),
  // },

  generateJSX: {
    description: " Generates JSX markup",
    payload: z.object({
      userPrompt: z.string(),
    }),

    return: z.unknown(),
  },

  generateCSS: {
    description: "Generates CSS styles",
    payload: z.object({
      userPrompt: z.string(),
    }),

    return: z.unknown(),
  },

  generateComponent: {
    description: "Generates component including state, handlers, and effects. ",
    payload: z.object({
      userPrompt: z.string(),
    }),

    return: z.unknown(),
  },
};

// export const AstTaskRegistry = {
//   ensureImport: {
//     description: "Ensures that an import exists in a file.",
//     payload: z.object({
//       code: z.string(),
//       source: z.string(),
//       importName: z.string(),
//       importType: z.string(),
//       alias: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   removeImport: {
//     description: "Removes imports from a source/module.",
//     payload: z.object({
//       code: z.string(),
//       source: z.string(),
//       importName: z.string(),
//       importType: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   optimizeImports: {
//     description: "Removes unused imports from a file.",
//     payload: z.object({
//       code: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   updateComponentImports: {
//     description: "update component imports",
//     payload: z.object({
//       componentPath: z.string(),
//       operations: z.unknown(),
//     }),

//     return: z.object({ operationsApplied: z.unknown() }),
//   },

//   insertJSX: {
//     description: "Inserts new JSX into a target component.",
//     payload: z.object({
//       code: z.string(),
//       componentName: z.string(),
//       targetElement: z.string(),
//       jsx: z.string(),
//       position: z.enum(["first", "last"]),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   replaceJSX: {
//     description: "Replaces an existing JSX element with new JSX.",
//     payload: z.object({
//       code: z.string(),
//       componentName: z.string(),
//       targetElement: z.string(),
//       newJSX: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   removeJSX: {
//     description: "Removes a JSX element from a component.",
//     payload: z.object({
//       code: z.string(),
//       componentName: z.string(),
//       targetElement: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   moveJSX: {
//     description: "Wraps a JSX element with a parent JSX element.",
//     payload: z.object({
//       code: z.string(),
//       componentName: z.string(),
//       sourceElement: z.string(),
//       destinationElement: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   wrapJSX: {
//     description: "Moves a JSX element to a different location in the JSX tree.",
//     payload: z.object({
//       code: z.string(),
//       componentName: z.string(),
//       targetElement: z.string(),
//       wrapperJSX: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   insertVariable: {
//     description: "Inserts a new variable declaration into code.",
//     payload: z.object({
//       code: z.string(),
//       variableName: z.string(),
//       value: z.string(),
//       scope: z.string(),
//       functionName: z.string(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   updateVariable: {
//     description: "Updates the value of an existing variable.",
//     payload: z.object({
//       code: z.string(),
//       variableName: z.string(),
//       newValue: z.string(),
//       line: z.number(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },

//   deleteVariable: {
//     description: "Removes a variable declaration from code.",
//     payload: z.object({
//       code: z.string(),
//       variableName: z.string(),
//       line: z.number(),
//     }),

//     return: z.object({ success: z.boolean(), updatedCode: z.string() }),
//   },
// };

export const MutationTaskRegistry = {
  // ast tasks
  ensureImport: {
    description: "Ensures that an import exists in a file.",
    payload: z.object({
      filePath: z.string(),
      source: z.string(),
      importName: z.string(),
      importType: z.string(),
      alias: z.nullable(z.string()),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  removeImport: {
    description: "Removes imports from a source/module.",
    payload: z.object({
      filePath: z.string(),
      source: z.string(),
      importName: z.string(),
      importType: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  optimizeImports: {
    description: "Removes unused imports from a file.",
    payload: z.object({
      filePath: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  updateComponentImports: {
    description: "update component imports",
    payload: z.object({
      componentPath: z.string(),
      operations: z.unknown(),
    }),

    return: z.object({ operationsApplied: z.unknown() }),
  },

  insertJSX: {
    description: "Inserts new JSX into a target component.",
    payload: z.object({
      filePath: z.string(),
      componentName: z.string(),
      targetElement: z.string(),
      jsx: z.string(),
      position: z.enum(["first", "last"]),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  replaceJSX: {
    description: "Replaces an existing JSX element with new JSX.",
    payload: z.object({
      filePath: z.string(),
      componentName: z.string(),
      targetElement: z.string(),
      newJSX: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  removeJSX: {
    description: "Removes a JSX element from a component.",
    payload: z.object({
      filePath: z.string(),
      componentName: z.string(),
      targetElement: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  moveJSX: {
    description: "Wraps a JSX element with a parent JSX element.",
    payload: z.object({
      filePath: z.string(),
      componentName: z.string(),
      sourceElement: z.string(),
      destinationElement: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  wrapJSX: {
    description: "Moves a JSX element to a different location in the JSX tree.",
    payload: z.object({
      filePath: z.string(),
      componentName: z.string(),
      targetElement: z.string(),
      wrapperJSX: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  insertVariable: {
    description: "Inserts a new variable declaration into code.",
    payload: z.object({
      filePath: z.string(),
      variableName: z.string(),
      value: z.string(),
      scope: z.string(),
      functionName: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  updateVariable: {
    description: "Updates the value of an existing variable.",
    payload: z.object({
      filePath: z.string(),
      variableName: z.string(),
      newValue: z.string(),
      // line: z.number(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  deleteVariable: {
    description: "Removes a variable declaration from code.",
    payload: z.object({
      filePath: z.string(),
      variableName: z.string(),
      // line: z.number(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  updateImportSource: {
    description: "Updates the source of an import statement.",
    payload: z.object({
      filePath: z.string(),
      oldSource: z.string(),
      newSource: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      filePath: z.string(),
    }),
  },

  // mutation tasks
  createComponent: {
    description: "Creates a new component directory and its associated files.",
    payload: z.object({
      componentName: z.string(),
      componentCode: z.optional(z.string()),
      parentDirectory: z.string(),
    }),

    return: z.union([
      z.object({
        success: z.boolean(),
        componentName: z.string(),
        componentDirectoryPath: z.string(),
        jsxFilePath: z.string(),
        cssFilePath: z.string(),
        indexFilePath: z.string(),
      }),
      z.object({ success: z.boolean() }),
    ]),
  },

  updateComponent: {
    description: "Updates the JSX returned by an existing React component.",
    payload: z.object({
      componentPath: z.string(),
      componentCode: z.string(),
    }),

    return: z.union([
      z.object({
        success: z.boolean(),
        componentPath: z.string(),
        oldComponentCode: z.string(),
        newComponentCode: z.string(),
      }),
      z.object({ success: z.boolean() }),
    ]),
  },

  deleteComponent: {
    description: "Removes a component by moving its directory to trash.",
    payload: z.object({
      componentName: z.string(),
      parentDirectory: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      componentDirectoryPath: z.string(),
      trashPath: z.union([z.string(), z.null()]),
    }),
  },

  moveComponent: {
    description: "Moves a component directory to a different location.",
    payload: z.object({
      sourcePath: z.string(),
      destinationPath: z.string(),
      createDestination: z.boolean(),
      overwrite: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      oldPath: z.string(),
      newPath: z.string(),
    }),
  },

  renameComponent: {
    description:
      "Renames a component and optionally updates its code references.",
    payload: z.object({
      componentPath: z.string(),
      newComponentName: z.string(),
      updateComponentCode: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      oldComponentName: z.string(),
      newComponentName: z.string(),
      newComponentPath: z.string(),
    }),
  },

  extractComponent: {
    description: "Extracts JSX into a new standalone component.",
    payload: z.object({
      parentComponentPath: z.string(),
      newComponentName: z.string(),
      targetJSX: z.string(),
      componentsDirectory: z.string(),
      includeCss: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      componentPath: z.string(),
      componentDirectoryPath: z.string(),
      updatedParentPath: z.string(),
    }),
  },

  createFile: {
    description: "Creates a new file in an existing directory.",
    payload: z.object({
      filePath: z.string(),
      content: z.string(),
    }),

    return: z.object({ success: z.boolean(), filePath: z.string() }),
  },

  deleteFile: {
    description: "Removes a file by moving it to trash.",
    payload: z.object({
      filePath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      filePath: z.string(),
      trashPath: z.string().nullable(),
    }),
  },

  renameFile: {
    description:
      "Renames a component and optionally updates its code references.",
    payload: z.object({
      oldFilePath: z.string(),
      newFilePath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      oldFilePath: z.string(),
      newFilePath: z.string(),
    }),
  },

  moveFile: {
    description: "Moves a file to another existing directory.",
    payload: z.object({
      fileName: z.string(),
      sourcePath: z.string(),
      destinationPath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      sourcePath: z.string(),
      destinationPath: z.string(),
    }),
  },

  createDirectory: {
    description: "Creates a new directory in an existing parent directory.",
    payload: z.object({
      directoryPath: z.string(),
    }),

    return: z.object({ directoryPath: z.string() }),
  },

  deleteDirectory: {
    description: "Removes a directory by moving it to trash.",
    payload: z.object({
      directoryPath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      directoryPath: z.string(),
      trashPath: z.string().nullable(),
    }),
  },

  renameDirectory: {
    description: "Renames an existing directory.",
    payload: z.object({
      oldDirectoryPath: z.string(),
      newDirectoryPath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      oldDirectoryPath: z.string(),
      newDirectoryPath: z.string(),
    }),
  },

  moveDirectory: {
    description: "Moves a directory to another existing location.",
    payload: z.object({
      sourcePath: z.string(),
      destinationPath: z.string(),
    }),

    return: z.object({
      success: z.boolean(),
      sourcePath: z.string(),
      destinationPath: z.string(),
    }),
  },

  updateStyles: {
    description: "Creates or updates CSS declarations for a selector.",
    payload: z.object({
      cssPath: z.string(),
      selector: z.string(),
      styles: z.record(z.string(), z.string()),
      createIfMissing: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      cssCode: z.string(),
      updatedCss: z.string(),
    }),
  },

  removeStyles: {
    description: "Removes CSS selectors or style declarations.",
    payload: z.object({
      cssPath: z.string(),
      target: z.record(z.string(), z.string()),
      removeAll: z.boolean(),
    }),

    return: z.object({
      success: z.boolean(),
      removed: z.boolean(),
      removedCount: z.number(),
      cssCode: z.string(),
      updatedCss: z.string(),
    }),
  },

  renameCssClass: {
    description: "Renames a CSS class in both CSS and JSX.",
    payload: z.object({
      cssPath: z.string(),
      componentJSXPath: z.string(),
      oldClassName: z.string(),
      newClassName: z.string(),
    }),

    return: z.object({
      renamed: z.boolean(),
      cssUpdated: z.boolean(),
      jsxUpdated: z.boolean(),
      cssCode: z.string(),
      updatedCssCode: z.string(),
      jsxCode: z.string(),
      updatedJsxCode: z.string(),
    }),
  },
};

export const QueryTaskRegistry = {
  readFile: {
    description: "Reads the contents of a file.",

    payload: z.object({
      filePath: z.string(),
    }),

    return: z.object({
      filePath: z.string(),
      content: z.string(),
    }),

    examples: [
      {
        filePath: "src/App.jsx",
      },
    ],
  },
  readPackageJson: {
    description: "Reads package.json.",

    payload: z.object({}),

    return: z.object({
      filePath: z.string(),
      packageJson: z.record(z.string(), z.any()),
    }),

    examples: [
      {
        projectRoot: "project root path",
      },
    ],
  },
  readReadme: {
    description: "Reads README.md.",

    payload: z.object({}),

    return: z.object({
      filePath: z.string(),
      content: z.string(),
    }),
  },
  findComponent: {
    description: "Find a component in the project.",

    payload: z.object({
      componentName: z.string(),
    }),

    return: z.object({
      componentName: z.string(),
      filePaths: z.array(z.string()),
    }),
  },
  searchText: {
    description:
      "Find arbitrary text in the project. Think of it as a project-wide grep.",

    payload: z.object({
      text: z.string(),
    }),

    return: z.object({
      matches: z.array(
        z.object({
          filePath: z.string(),
          lineNumber: z.number(),
          line: z.string(),
        }),
      ),
    }),

    examples: [
      {
        query: "useState",
      },
      {
        query: "ProductCard", // "Where is ProductCard used?"
      },
      {
        query: "fetch(", // "Where are API calls made?"
      },
      {
        query: "TODO", // "Find every TODO."
      },
      {
        query: "localStorage", // "Find all usages of localStorage."
      },
      {
        query: "primary-button", // "Where is class 'primary-button' used?"
      },
    ],
  },
  readComponent: {
    description: "Reads a component.",

    payload: z.object({
      componentName: z.string(),
    }),

    return: z.object({
      componentName: z.string(),
      filePath: z.string(),
      content: z.string(),
    }),
  },
  findSymbolReferences: {
    description: "Finds references of a symbol.",

    payload: z.object({
      symbol: z.string(),
    }),

    return: z.object({
      references: z.array(
        z.object({
          filePath: z.string(),
          lineNumber: z.number(),
          line: z.string(),
        }),
      ),
    }),

    examples: [
      {
        symbol: "Button",
      },
    ],
  },
  getRuntimeSnapshot: {
    description: "Gets the current runtime snapshot.",

    payload: z.object({}),

    return: z.object({
      currentRoute: z.string(),

      visibleComponents: z.array(
        z.object({
          id: z.string(),
          visible: z.boolean(),
        }),
      ),

      viewport: z.object({
        width: z.number(),
        height: z.number(),
      }),
    }),
  },
  getRuntimeError: {
    description: "Gets the latest runtime error.",

    payload: z.object({}),

    return: z.object({
      error: z
        .object({
          type: z.enum(["error", "unhandledrejection"]),

          message: z.string(),

          stack: z.string().optional(),
        })
        .nullable(),
    }),
  },
  listRoutes: {
    description: "Gets list of all routes",

    payload: z.object({}),

    return: z.array(z.string()),
  },
};

export const TaskRegistry = {
  ...MutationTaskRegistry,
  ...QueryTaskRegistry,
  // ...AstTaskRegistry,
  ...HelpersTaskRegistry,
  // ...RuntimeTaskRegistry,
  // ...RefactorTaskRegistry,
  ...GenerationTaskRegistry,
};

export type TaskName = keyof typeof TaskRegistry;

export type TaskPayload<T extends TaskName> = z.infer<
  (typeof TaskRegistry)[T]["payload"]
>;

export type TaskReturn<T extends TaskName> = z.infer<
  (typeof TaskRegistry)[T]["return"]
>;

export type TaskResponse<T> = {
  success: boolean;
  message?: string;
  [key: string]: unknown; // Allows any other property, but its type is unknown
} & T;
