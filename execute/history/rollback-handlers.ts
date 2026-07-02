import fs from "fs";
import path from "path";

import {
  type AppContext,
  type ComponentContext,
  type AnalyaseCommandReturns,
  type Operation,
  type Action,
  ERROR_CODES,
} from "../../schemas/index.js";

import type {
  TaskPayload,
  TaskReturn,
  TaskResponse,
  ExecutionContext,
} from "../../schemas/index.js";

/*

Never use planner methods directly in rollback handlers, 
as they may have side effects that can interfere with rollback process. 
Instead, implement rollback logic using direct file system operations 
to ensure reliable and consistent rollbacks.

*/
import mutations from "../../execute/tasks/mutations.js";
import { LoomaError } from "../../server/error.js";

/**
 * 
 * const serializer = operationSerializers[taskName];

  const operationPayload = serializer(taskResult);
 * 
 * 
 */
const operationSerializers = {
  ensureLibrary: ({
    packageJsonPath,
    beforePackageJson,
    afterPackageJson,
  }) => ({
    target: {
      packageJsonPath,
    },
    before: {
      packageJson: beforePackageJson,
    },
    after: {
      packageJson: afterPackageJson,
    },
  }),

  removeLibrary: ({
    packageJsonPath,
    beforePackageJson,
    afterPackageJson,
  }) => ({
    target: {
      packageJsonPath,
    },
    before: {
      packageJson: beforePackageJson,
    },
    after: {
      packageJson: afterPackageJson,
    },
  }),

  // ensureImport: ({
  //   payload: { code, source, importName, importType, alias },
  //   result: { updatedCode },
  // }) => ({
  //   target: {
  //     code,
  //   },
  //   before: {
  //     code: code,
  //   },
  //   after: {
  //     code: updatedCode,
  //   },
  // }),

  removeImport: ({
    payload: { code, source, importName, importType },
    result: { updatedCode },
  }) => ({
    target: {
      code: code,
      source,
      importName,
      importType,
    },
    before: {
      code: code,
    },
    after: {
      code: updatedCode,
    },
  }),

  // optimizeImports: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //   },
  //   before: {
  //     code: beforeCode,
  //   },
  //   after: {
  //     code: afterCode,
  //   },
  // }),

  insertVariable: ({
    payload: { code, variableName, value, scope, functionName },
    result: { updatedCode },
  }) => ({
    target: {
      code,
      variableName,
      value,
      scope,
      functionName,
    },
    before: {
      code: code,
    },
    after: {
      code: updatedCode,
    },
  }),

  updateVariable: ({
    payload: { code, variableName, newValue, line },
    result: { updatedCode },
  }) => ({
    target: {
      code,
      variableName,
      newValue,
    },
    before: {
      code: code,
    },
    after: {
      code: updatedCode,
    },
  }),

  deleteVariable: ({
    payload: { code, variableName, line },
    result: { updatedCode },
  }) => ({
    target: {
      code,
      variableName,
    },
    before: {
      code,
    },
    after: {
      deleted: true,
    },
  }),

  // createFunction: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     functionName,
  //   },
  //   before: {
  //     code: beforeCode,
  //   },
  //   after: {
  //     code: afterCode,
  //   },
  // }),

  // updateFunction: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     functionName,
  //   },
  //   before: {
  //     functionCode: beforeFunctionCode,
  //   },
  //   after: {
  //     functionCode: afterFunctionCode,
  //   },
  // }),

  // deleteFunction: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     functionName,
  //   },
  //   before: {
  //     functionCode: beforeFunctionCode,
  //   },
  //   after: {
  //     deleted: true,
  //   },
  // }),

  // insertCode: ({ payload, result }) => ({
  //   target: {
  //     filePath,
  //   },
  //   before: {
  //     code: beforeCode,
  //   },
  //   after: {
  //     code: beforeCode,
  //   },
  // }),

  // insertJSX: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     targetElement,
  //   },
  //   before: {
  //     jsx: beforeJsx,
  //   },
  //   after: {
  //     jsx: afterJsx,
  //   },
  // }),

  // replaceJSX: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     targetElement,
  //   },
  //   before: {
  //     jsx: beforeJsx,
  //   },
  //   after: {
  //     jsx: afterJsx,
  //   },
  // }),

  // removeJSX: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     targetElement,
  //   },
  //   before: {
  //     jsx: beforeJsx,
  //   },
  //   after: {
  //     removed: true,
  //   },
  // }),

  // wrapJSX: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     targetElement,
  //   },
  //   before: {
  //     jsx: beforeJsx,
  //   },
  //   after: {
  //     jsx: afterJsx,
  //   },
  // }),

  // moveJSX: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     sourceElement,
  //     destinationElement,
  //   },
  //   before: {
  //     sourceJSX: beforeSourceJSX,
  //     destinationJSX: beforeDestinationJSX,
  //   },
  //   after: {
  //     sourceJSX: afterSourceJSX,
  //     destinationJSX: afterDestinationJSX,
  //   },
  // }),

  createFile: ({ payload: { filePath, content = "" }, result }) => ({
    target: {
      filePath,
    },
    before: {
      exists: false,
    },
    after: {
      content,
    },
  }),

  deleteFile: ({
    payload: { filePath },
    result: { success, filePath: flPath, trashPath },
  }) => ({
    target: {
      originalPath: filePath,
      trashPath,
    },
    before: {
      path: filePath,
    },
    after: {
      path: trashPath,
    },
  }),

  renameFile: ({
    payload: { oldFilePath, newFilePath },
    result: { success, oldFilePath: oldPath, newFilePath: newPath },
  }) => ({
    target: {
      oldFilePath,
      newFilePath,
    },
    before: {
      oldFilePath,
    },
    after: {
      newFilePath,
    },
  }),

  moveFile: ({
    payload: { sourcePath, destinationPath },
    result: { success, sourcePath: srcPath, destinationPath: dstPath },
  }) => ({
    target: {
      sourcePath,
      destinationPath,
    },
    before: {
      sourcePath,
    },
    after: {
      destinationPath,
    },
  }),
  createDirectory: ({ payload: { directoryPath } }, context: AppContext) => {
    const directoryName = path.basename(directoryPath);

    return {
      target: {
        directoryPath,
        trashPath: path.join(
          context.project.trashDir,
          `${Date.now()}_${directoryName}`,
        ),
      },

      before: {
        exists: false,
      },

      after: {
        exists: true,
      },
    };
  },

  deleteDirectory: ({ payload: { directoryPath }, result: { trashPath } }) => ({
    target: {
      originalPath: directoryPath,
      trashPath,
    },
    before: {
      path: directoryPath,
    },
    after: {
      path: trashPath,
    },
  }),

  renameDirectory: ({
    payload: { oldDirectoryPath, newDirectoryPath },
    result,
  }) => ({
    target: {
      oldDirectoryPath,
      newDirectoryPath,
    },
    before: {
      oldDirectoryPath,
    },
    after: {
      newDirectoryPath,
    },
  }),

  moveDirectory: ({ payload: { sourcePath, destinationPath }, result }) => ({
    target: {
      sourcePath,
      destinationPath,
    },
    before: {
      sourcePath,
    },
    after: {
      destinationPath,
    },
  }),

  createComponent: ({ result: { componentDirectoryPath } }) => ({
    target: {
      componentDirectoryPath,
    },

    before: null,

    after: {
      componentDirectoryPath,
    },
  }),

  updateComponent: ({
    payload: { componentPath },

    result: { oldComponentCode, newComponentCode },
  }) => ({
    target: {
      componentPath,
    },

    before: {
      componentCode: oldComponentCode,
    },

    after: {
      componentCode: newComponentCode,
    },
  }),

  deleteComponent: ({
    payload: { componentName, parentDirectory },
    result: { componentDirectoryPath, trashPath },
  }) => ({
    target: {
      componentName,
      parentDirectory,
      componentDirectoryPath,
    },

    before: {
      exists: true,
    },

    after: {
      exists: false,
      trashPath,
    },
  }),

  moveComponent: ({ payload, result }) => ({
    target: {
      sourcePath: payload.sourcePath,
      destinationPath: payload.destinationPath,
    },
    before: {
      existsAt: payload.sourcePath,
    },
    after: {
      existsAt: payload.destinationPath,
    },
  }),

  renameComponent: ({
    payload: { componentPath, updateComponentCode },
    result: { renamed, oldComponentName, newComponentName, newComponentPath },
  }) => ({
    target: {
      oldComponentpath: componentPath,
      newComponentPath,
      oldComponentName,
      newComponentName,
    },
    before: {
      componentName: oldComponentName,
    },
    after: {
      componentName: newComponentName,
    },
  }),

  // extractComponent: ({ payload: {
  //   parentComponentPath,
  //   newComponentName,
  //   targetJSX,
  //   componentsDirectory,
  //   includeCss}, result: {
  //     success,
  //     componentPath: newComponentPath,
  //     updatedParentPath: absoluteParentPath,
  //   } }) => ({
  //   target: {
  //     parentComponentPath,
  //     newComponentPath,
  //   },
  //   before: {
  //     parentComponentCode: beforeParentComponentCode,
  //   },
  //   after: {
  //     parentComponentCode: afterParentComponentCode,
  //     extractedComponentCode,
  //   },
  // }),

  // ensureComponentStructure: ({ payload, result }) => ({
  //   target: {
  //     componentDirectory,
  //   },
  //   before: {
  //     directorySnapshot: beforeDirectorySnapshot,
  //   },
  //   after: {
  //     directorySnapshot: afterDirectorySnapshot,
  //   },
  // }),

  // updateComponentImports: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //   },
  //   before: {
  //     imports: beforeImports,
  //   },
  //   after: {
  //     imports: afterImports,
  //   },
  // }),

  // normalizeComponent: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //   },
  //   before: {
  //     componentCode: beforeComponentCode,
  //     cssCode: beforeCssCode,
  //   },
  //   after: {
  //     componentCode: afterComponentCode,
  //     cssCode: afterCssCode,
  //   },
  // }),

  // ensureStyleFile: ({ payload, result }) => ({
  //   target: {
  //     cssPath,
  //   },
  //   before: {
  //     exists: false,
  //   },
  //   after: {
  //     cssCode: cssCode,
  //   },
  // }),

  insertStyles: ({ payload: { cssPath, styles, addNewLine }, result }) => ({
    target: {
      cssPath,
    },
    before: {
      cssCode: styles,
    },
    after: {
      cssCode: styles,
    },
  }),

  updateStyles: ({
    payload: { cssPath, selector, styles, createIfMissing },
    result: { success, cssCode, updatedCss },
  }) => ({
    target: {
      cssPath,
      selector,
    },
    before: {
      cssCode,
    },
    after: {
      cssCode: updatedCss,
    },
  }),

  removeStyles: ({
    payload: { cssPath, target, removeAll },
    result: { success, removed, removedCount, cssCode, updatedCss },
  }) => ({
    target: {
      cssPath,
    },
    before: {
      cssCode,
    },
    after: {
      updatedCss,
    },
  }),

  renameCssClass: ({
    payload: { cssPath, componentJSXPath, oldClassName, newClassName },
    result: { cssCode, updatedCssCode, jsxCode, updatedJsxCode },
  }) => ({
    target: {
      cssPath,
      componentJSXPath,
      oldClassName,
      newClassName,
    },
    before: {
      cssCode: cssCode,
      componentJsxCode: jsxCode,
    },
    after: {
      cssCode: updatedCssCode,
      componentJsxCode: updatedJsxCode,
    },
  }),

  // syncComponentStyles: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //     cssPath,
  //   },
  //   before: {
  //     componentCode: beforeComponentCode,
  //     cssCode: beforeCssCode,
  //   },
  //   after: {
  //     componentCode: afterComponentCode,
  //     cssCode: afterCssCode,
  //   },
  // }),

  // resolveImportConflicts: ({ payload, result }) => ({
  //   target: {
  //     componentPath,
  //   },
  //   before: {
  //     imports: beforeImports,
  //   },
  //   after: {
  //     imports: afterImports,
  //   },
  // }),

  // resolveCssClassConflicts: ({ payload, result }) => ({
  //   target: {
  //     cssPath,
  //     componentPath,
  //   },
  //   before: {
  //     componentCode: beforeComponentCode,
  //     cssCode: beforeCssCode,
  //   },
  //   after: {
  //     componentCode: afterComponentCode,
  //     cssCode: afterCssCode,
  //   },
  // }),

  // resolveStyleDependencies: ({ payload, result }) => ({
  //   target: {
  //     cssPath,
  //   },
  //   before: {
  //     imports: beforeImports,
  //   },
  //   after: {
  //     imports: afterImports,
  //   },
  // }),
};

/**
 * Rolls back moveComponent operation.
 *
 * This restores component directory
 * back to its original location.
 */
function undoMoveComponent(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths from operation
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve component name
  // ----------------------------------------------------------
  //
  // Example:
  //
  // ../../src/components/Header
  //
  // -> Header
  //
  // ----------------------------------------------------------

  const componentName = path.basename(sourcePath);

  // ----------------------------------------------------------
  // STEP 3:
  // Build current moved path
  // ----------------------------------------------------------
  //
  // Current location after move:
  //
  // destinationPath/componentName
  //
  // ----------------------------------------------------------

  const movedComponentPath = path.join(destinationPath, componentName);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure moved component exists
  // ----------------------------------------------------------

  if (!fs.existsSync(movedComponentPath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Moved component not found: ${movedComponentPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Ensure original parent directory exists
  // ----------------------------------------------------------
  //
  // Example:
  //
  // ../../src/components/App
  //
  // ----------------------------------------------------------

  const originalParentDirectory = path.dirname(sourcePath);

  fs.mkdirSync(originalParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 6:
  // Move component back
  // ----------------------------------------------------------

  fs.renameSync(movedComponentPath, sourcePath);

  // ----------------------------------------------------------
  // STEP 7:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredPath: sourcePath,
  };
}

/**
 * Rolls back a renameComponent operation.
 *
 * Params:
 * - operation:
 *   Operation log entry created by appendOperation.
 *
 * Returns:
 * - {
 *     rolledBack: boolean,
 *     componentPath: string
 *   }
 */
function undoRenameComponent(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract information from operation log.
  // ----------------------------------------------------------

  const { newComponentPath: componentPath } = operation.target;

  const { componentName: oldComponentName } = operation.before;

  const { componentName: newComponentName } = operation.after;

  // ----------------------------------------------------------
  // STEP 2:
  // Rename component back to its original name.
  // ----------------------------------------------------------

  const result = mutations.renameComponent(
    {
      componentPath,
      newComponentName: oldComponentName,

      // Preserve the same behavior that was
      // used during the original rename.
      updateComponentCode: true,
    },
    appContext,
  );

  // ----------------------------------------------------------
  // STEP 3:
  // Validate rollback.
  // ----------------------------------------------------------

  if (!result?.success) {
    throw new LoomaError(
      ERROR_CODES.ROLLBACK_ERROR,
      `Failed to rollback renameComponent: ${newComponentName} -> ${oldComponentName}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Return result.
  // ----------------------------------------------------------

  return {
    success: true,
    componentPath,
  };
}

function undoCreateComponent(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  fs.rmSync(
    path.resolve(
      appContext.project.root,
      operation.target.componentDirectoryPath,
    ),
    {
      recursive: true,
      force: true,
    },
  );

  return {
    success: true,
  };
}

function undoDeleteComponent(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // Resolve source directory inside trash.
  // ----------------------------------------------------------

  const sourcePath = path.resolve(
    appContext.project.root,
    operation.after.trashPath,
  );

  // ----------------------------------------------------------
  // Resolve original component path.
  // Example:
  // src/components/Home
  // ----------------------------------------------------------

  const destinationPath = path.resolve(
    appContext.project.root,
    operation.target.componentDirectoryPath,
  );

  // ----------------------------------------------------------
  // Make sure parent directory exists.
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(destinationPath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // Restore directory with its original name.
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, destinationPath);

  return {
    success: true,
    sourcePath,
    destinationPath,
  };
}

/**
 * Rolls back insertCode operation.
 *
 * Restores file content back
 * to original state before insertion.
 */
// function undoInsertCode(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract file path
//   // ----------------------------------------------------------

//   const { filePath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original file content
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback data exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original file content
//   // ----------------------------------------------------------

//   fs.writeFileSync(filePath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredFilePath: filePath,
//   };
// }

/**
 * Rolls back extractComponent operation.
 *
 * This:
 * - restores original parent component code
 * - removes extracted component directory
 */
function undoExtractComponent(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract rollback information
  // ----------------------------------------------------------

  const { parentComponentPath, newComponentPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract original parent component code
  // ----------------------------------------------------------

  const originalParentCode = operation.before.parentComponentCode;

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure rollback snapshot exists
  // ----------------------------------------------------------

  if (typeof originalParentCode !== "string") {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      "Missing parent component snapshot.",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Restore original parent component
  // ----------------------------------------------------------

  fs.writeFileSync(parentComponentPath, originalParentCode, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Remove extracted component directory
  // ----------------------------------------------------------
  //
  // Example:
  //
  // /src/components/Header
  //
  // ----------------------------------------------------------

  if (fs.existsSync(newComponentPath)) {
    fs.rmSync(newComponentPath, {
      recursive: true,
      force: true,
    });
  }

  // ----------------------------------------------------------
  // STEP 6:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredParent: parentComponentPath,

    removedComponent: newComponentPath,
  };
}

/**
 * Rolls back insertJSX operation.
 *
 * Restores component source code
 * back to original state before JSX insertion.
 */
// function undoInsertJSX(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract component file path
//   // ----------------------------------------------------------

//   const { componentPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original component code
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original component code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original component code
//   // ----------------------------------------------------------

//   fs.writeFileSync(componentPath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredComponent: componentPath,
//   };
// }

/**
 * Rolls back replaceJSX operation.
 *
 * Restores component source code
 * back to original state before JSX replacement.
 */
// function undoReplaceJSX(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract component file path
//   // ----------------------------------------------------------

//   const { componentPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original component code
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original component code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original component code
//   // ----------------------------------------------------------

//   fs.writeFileSync(componentPath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredComponent: componentPath,
//   };
// }

/**
 * Rolls back removeJSX operation.
 *
 * Restores component source code
 * back to original state before JSX removal.
 */

// function undoRemoveJSX(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract component file path
//   // ----------------------------------------------------------

//   const { componentPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original component code
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original component code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original component code
//   // ----------------------------------------------------------

//   fs.writeFileSync(componentPath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredComponent: componentPath,
//   };
// }

/**
 * Rolls back moveJSX operation.
 *
 * Restores component source code
 * back to original state before JSX movement.
 */

// function undoMoveJSX(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract component file path
//   // ----------------------------------------------------------

//   const { componentPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original component code
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original component code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original component code
//   // ----------------------------------------------------------

//   fs.writeFileSync(componentPath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredComponent: componentPath,
//   };
// }

/**
 * Rolls back wrapJSX operation.
 *
 * Restores component source code
 * back to original state before JSX wrapping.
 */

// function undoWrapJSX(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract component file path
//   // ----------------------------------------------------------

//   const { componentPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original component code
//   // ----------------------------------------------------------

//   const originalCode = operation.before.code;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCode !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original component code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original component code
//   // ----------------------------------------------------------

//   fs.writeFileSync(componentPath, originalCode, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredComponent: componentPath,
//   };
// }

/**
 * Rolls back createFile operation.
 *
 * Removes file that was created
 * during createFile task execution.
 */

function undoCreateFile(operation, appContext: AppContext): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file path
  // ----------------------------------------------------------

  const { filePath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(filePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `File does not exist: ${filePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Remove created file
  // ----------------------------------------------------------

  fs.unlinkSync(filePath);

  // ----------------------------------------------------------
  // STEP 4:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    removedFile: filePath,
  };
}

/**
 * Rolls back deleteFile operation.
 *
 * Restores deleted file
 * back to original location.
 */

function undoDeleteFile(operation, appContext: AppContext): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { originalPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure deleted file exists in trash
  // ----------------------------------------------------------

  if (!fs.existsSync(trashPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Deleted file not found in trash: ${trashPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(originalPath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Restore file back
  // ----------------------------------------------------------

  fs.renameSync(trashPath, originalPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredFile: originalPath,
  };
}

/**
 * Rolls back renameFile operation.
 *
 * Renames file back
 * to its original path.
 */

function undoRenameFile(operation, appContext: AppContext): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { oldFilePath, newFilePath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure renamed file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(newFilePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Renamed file not found: ${newFilePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(oldFilePath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Rename file back
  // ----------------------------------------------------------

  fs.renameSync(newFilePath, oldFilePath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredFile: oldFilePath,
  };
}

/**
 * Rolls back moveFile operation.
 *
 * Moves file back
 * to its original location.
 */

function undoMoveFile(operation, appContext: AppContext): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve moved file path
  // ----------------------------------------------------------
  //
  // Example:
  //
  // sourcePath:
  // /src/tasks/helpers/api.js
  //
  // destinationPath:
  // /src/services
  //
  // moved file:
  // /src/services/api.js
  //
  // ----------------------------------------------------------

  const fileName = path.basename(sourcePath);
  //   const dstFileName = path.basename(destinationPath);

  const movedFilePath = path.join(destinationPath, fileName);

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure moved file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(movedFilePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Moved file not found: ${movedFilePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const originalParentDirectory = path.dirname(sourcePath);

  fs.mkdirSync(originalParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Move file back
  // ----------------------------------------------------------

  fs.renameSync(movedFilePath, sourcePath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredFile: sourcePath,
  };
}

/**
 * Rolls back createDirectory operation.
 *
 * Removes directory that was created
 * during createDirectory task execution.
 */

function undoCreateDirectory(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths
  // ----------------------------------------------------------

  const { directoryPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(directoryPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Directory not found: ${directoryPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure trash parent exists
  // ----------------------------------------------------------

  fs.mkdirSync(path.dirname(trashPath), {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Move directory to trash
  // ----------------------------------------------------------

  fs.renameSync(directoryPath, trashPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,

    removedDirectory: directoryPath,
  };
}

/**
 * Rolls back deleteDirectory operation.
 *
 * Restores deleted directory
 * back to original location.
 */

function undoDeleteDirectory(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract directory paths
  // ----------------------------------------------------------

  const { originalPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure deleted directory exists in trash
  // ----------------------------------------------------------

  if (!fs.existsSync(trashPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Deleted directory not found in trash: ${trashPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(originalPath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Restore directory back
  // ----------------------------------------------------------

  fs.renameSync(trashPath, originalPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredDirectory: originalPath,
  };
}

/**
 * Rolls back renameDirectory operation.
 *
 * Renames directory back
 * to its original path.
 */

function undoRenameDirectory(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract directory paths
  // ----------------------------------------------------------

  const { oldDirectoryPath, newDirectoryPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure renamed directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(newDirectoryPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Renamed directory not found: ${newDirectoryPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(oldDirectoryPath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Rename directory back
  // ----------------------------------------------------------

  fs.renameSync(newDirectoryPath, oldDirectoryPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredDirectory: oldDirectoryPath,
  };
}

/**
 * Rolls back moveDirectory operation.
 *
 * Moves directory back
 * to its original location.
 */

function undoMoveDirectory(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Determine moved directory path
  // ----------------------------------------------------------

  const directoryName = path.basename(sourcePath);

  const movedDirectoryPath = path.join(destinationPath, directoryName);

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure moved directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(movedDirectoryPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Moved directory not found: ${movedDirectoryPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure original parent directory exists
  // ----------------------------------------------------------

  const originalParentDirectory = path.dirname(sourcePath);

  fs.mkdirSync(originalParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Move directory back
  // ----------------------------------------------------------

  fs.renameSync(movedDirectoryPath, sourcePath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredDirectory: sourcePath,
  };
}

/**
 * Rolls back insertStyles operation.
 *
 * Restores CSS file content
 * back to original state before style insertion.
 */

// function undoInsertStyles(
//   operation
// ): TaskResponse<any> {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Extract CSS file path
//   // ----------------------------------------------------------

//   const { cssPath } = operation.target;

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Extract original CSS content
//   // ----------------------------------------------------------

//   const originalCss = operation.before.cssCode;

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure rollback snapshot exists
//   // ----------------------------------------------------------

//   if (typeof originalCss !== "string") {
//     throw new LoomaError(ERROR_CODES.COMPONENT_NOT_FOUND,"Missing original CSS code for rollback.");
//   }

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore original CSS content
//   // ----------------------------------------------------------

//   fs.writeFileSync(cssPath, originalCss, "utf8");

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return rollback result
//   // ----------------------------------------------------------

//   return {
//     success: true,

//     restoredCssFile: cssPath,
//   };
// }

/**
 * Rolls back updateStyles operation.
 *
 * Restores CSS file content
 * back to original state before style update.
 */

function undoUpdateStyles(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract CSS file path
  // ----------------------------------------------------------

  const { cssPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract original CSS content
  // ----------------------------------------------------------

  const originalCss = operation.before.cssCode;

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure rollback snapshot exists
  // ----------------------------------------------------------

  if (typeof originalCss !== "string") {
    throw new LoomaError(
      ERROR_CODES.CSS_NOT_FOUND,
      "Missing original CSS code for rollback.",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Restore original CSS content
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, originalCss, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredCssFile: cssPath,
  };
}

/**
 * Rolls back removeStyles operation.
 *
 * Restores CSS file content
 * back to original state before style removal.
 */

function undoRemoveStyles(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract CSS file path
  // ----------------------------------------------------------

  const { cssPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract original CSS content
  // ----------------------------------------------------------

  const originalCss = operation.before.cssCode;

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure rollback snapshot exists
  // ----------------------------------------------------------

  if (typeof originalCss !== "string") {
    throw new LoomaError(
      ERROR_CODES.CSS_NOT_FOUND,
      "Missing original CSS code for rollback.",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Restore original CSS content
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, originalCss, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredCssFile: cssPath,
  };
}

/**
 * Restores CSS and JSX files
 * to state before renameCssClass.
 */

function undoRenameCssClass(
  operation,
  appContext: AppContext,
): TaskResponse<any> {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract target files
  // ----------------------------------------------------------

  const { cssPath, componentJSXPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract original contents
  // ----------------------------------------------------------

  const { cssCode, jsxCode } = operation.before;

  // ----------------------------------------------------------
  // STEP 3:
  // Validate snapshots
  // ----------------------------------------------------------

  if (typeof cssCode !== "string") {
    throw new LoomaError(
      ERROR_CODES.CSS_NOT_FOUND,
      "Missing cssCode in operation.before",
    );
  }

  if (typeof jsxCode !== "string") {
    throw new LoomaError(
      ERROR_CODES.JSX_NOT_FOUND,
      "Missing jsxCode in operation.before",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Restore CSS file
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, cssCode, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Restore JSX file
  // ----------------------------------------------------------

  fs.writeFileSync(componentJSXPath, jsxCode, "utf8");

  // ----------------------------------------------------------
  // STEP 6:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,
    cssPath,
    componentJSXPath,
  };
}

// function undoRemoveImport(
//   operation
// ): TaskResponse<any> {
//   return {
//     success: true,
//     updatedCode: operation.before.code,
//   };
// }

// function undoInsertVariable(
//   operation
// ): TaskResponse<any> {
//   return {
//     success: true,
//     updatedCode: operation.before.code,
//   };
// }

// function undoUpdateVariable(
//   operation
// ): TaskResponse<any> {
//   return {
//     success: true,
//     updatedCode: operation.before.code,
//   };
// }
// function undoDeleteVariable(
//   operation
// ): TaskResponse<any> {
//   return {
//     success: true,
//     updatedCode: operation.before.code,
//   };
// }

/**
 * Restores a directory from .looma-trash to its original location.
 *
 * Params:
 * - trashPath:
 *   Relative path of the directory inside .looma-trash.
 *
 * - originalPath:
 *   Original relative path of the directory before deletion.
 *
 * Returns:
 * {
 *   success: boolean,
 *   trashPath: string,
 *   originalPath: string
 * }
 */
// function restoreDirectory({ trashPath, originalPath }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Convert relative paths to absolute paths.
//   // ----------------------------------------------------------

//   const absoluteTrashPath = path.resolve(process.cwd(), trashPath);

//   const absoluteOriginalPath = path.resolve(process.cwd(), originalPath);

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Verify that the directory exists in trash.
//   // ----------------------------------------------------------

//   if (!fs.existsSync(absoluteTrashPath)) {
//     return {
//       success: false,
//       message: "Directory does not exist in trash",
//       trashPath,
//       originalPath,
//     };
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure parent directory exists.
//   //
//   // Example:
//   //
//   // originalPath:
//   // src/components/Home
//   //
//   // parent directory:
//   // src/components
//   // ----------------------------------------------------------

//   const parentDirectory = path.dirname(absoluteOriginalPath);

//   fs.mkdirSync(parentDirectory, {
//     recursive: true,
//   });

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Move the directory back to its original location.
//   // This restores both location and name.
//   // ----------------------------------------------------------

//   fs.renameSync(absoluteTrashPath, absoluteOriginalPath);

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return success.
//   // ----------------------------------------------------------

//   return {
//     success: true,
//     trashPath,
//     originalPath,
//   };
// }

/**
 * Restores a file from .looma-trash to its original location.
 *
 * Params:
 * - trashPath:
 *   Relative path of the file inside .looma-trash.
 *
 * - originalPath:
 *   Original relative path of the file before deletion.
 *
 * Returns:
 * {
 *   success: boolean,
 *   trashPath: string,
 *   originalPath: string
 * }
 */
// function restoreFile({ trashPath, originalPath }) {
//   // ----------------------------------------------------------
//   // STEP 1:
//   // Convert relative paths to absolute paths.
//   // ----------------------------------------------------------

//   const absoluteTrashPath = path.resolve(process.cwd(), trashPath);

//   const absoluteOriginalPath = path.resolve(process.cwd(), originalPath);

//   // ----------------------------------------------------------
//   // STEP 2:
//   // Verify that the file exists in trash.
//   // ----------------------------------------------------------

//   if (!fs.existsSync(absoluteTrashPath)) {
//     return {
//       success: false,
//       message: "File does not exist in trash",
//       trashPath,
//       originalPath,
//     };
//   }

//   // ----------------------------------------------------------
//   // STEP 3:
//   // Ensure parent directory exists.
//   //
//   // Example:
//   //
//   // originalPath:
//   // src/App/Header.tsx
//   //
//   // parent directory:
//   // src/App
//   // ----------------------------------------------------------

//   const parentDirectory = path.dirname(absoluteOriginalPath);

//   fs.mkdirSync(parentDirectory, {
//     recursive: true,
//   });

//   // ----------------------------------------------------------
//   // STEP 4:
//   // Restore the file to its original path.
//   // ----------------------------------------------------------

//   fs.renameSync(absoluteTrashPath, absoluteOriginalPath);

//   // ----------------------------------------------------------
//   // STEP 5:
//   // Return success.
//   // ----------------------------------------------------------

//   return {
//     success: true,
//     trashPath,
//     originalPath,
//   };
// }

function undoUpdateComponent(operation, appContext) {
  const { componentPath } = operation.target;

  const { componentCode } = operation.before;

  fs.writeFileSync(componentPath, componentCode, "utf8");

  return {
    success: true,
    componentPath,
  };
}

const undoHandlers = {
  // removeImport: (operation, appContext) => {
  //   undoRemoveImport(operation, appContext);
  // },
  moveComponent: (operation, appContext) => {
    undoMoveComponent(operation, appContext);
  },
  renameComponent: (operation, appContext) => {
    undoRenameComponent(operation, appContext);
  },
  createComponent: (operation, appContext) => {
    undoCreateComponent(operation, appContext);
  },
  deleteComponent: (operation, appContext) => {
    undoDeleteComponent(operation, appContext);
  },
  // insertVariable: (operation, appContext) => {
  //   undoInsertVariable(operation, appContext);
  // },
  // updateVariable: (operation, appContext) => {
  //   undoUpdateVariable(operation, appContext);
  // },
  // deleteVariable: (operation, appContext) => {
  //   undoDeleteVariable(operation, appContext);
  // },
  // insertCode: (operation, appContext) => {
  //   undoInsertCode(operation, appContext);
  // },
  extractComponent: (operation, appContext) => {
    undoExtractComponent(operation, appContext);
  },
  // insertJSX: (operation, appContext) => {
  //   undoInsertJSX(operation, appContext);
  // },
  // replaceJSX: (operation, appContext) => {
  //   undoReplaceJSX(operation, appContext);
  // },
  // removeJSX: (operation, appContext) => {
  //   undoRemoveJSX(operation, appContext);
  // },
  // moveJSX: (operation, appContext) => {
  //   undoMoveJSX(operation, appContext);
  // },
  // wrapJSX: (operation, appContext) => {
  //   undoWrapJSX(operation, appContext);
  // },
  updateComponent: (operation, appContext) => {
    undoUpdateComponent(operation, appContext);
  },
  //   normalizeComponent: (operation, appContext) => {
  //     undoNormalizeComponent(operation, appContext);
  //   },
  createFile: (operation, appContext) => {
    undoCreateFile(operation, appContext);
  },
  deleteFile: (operation, appContext) => {
    undoDeleteFile(operation, appContext);
  },
  renameFile: (operation, appContext) => {
    undoRenameFile(operation, appContext);
  },
  moveFile: (operation, appContext) => {
    undoMoveFile(operation, appContext);
  },
  createDirectory: (operation, appContext) => {
    undoCreateDirectory(operation, appContext);
  },
  deleteDirectory: (operation, appContext) => {
    undoDeleteDirectory(operation, appContext);
  },
  renameDirectory: (operation, appContext) => {
    undoRenameDirectory(operation, appContext);
  },
  moveDirectory: (operation, appContext) => {
    undoMoveDirectory(operation, appContext);
  },
  // insertStyles: (operation, appContext) => {
  //   undoInsertStyles(operation, appContext);
  // },
  updateStyles: (operation, appContext) => {
    undoUpdateStyles(operation, appContext);
  },
  removeStyles: (operation, appContext) => {
    undoRemoveStyles(operation, appContext);
  },
  renameCssClass: (operation, appContext) => {
    undoRenameCssClass(operation, appContext);
  },
  //   syncComponentStyles: (operation, appContext) => {
  //     undoSyncComponentStyles(operation, appContext);
  //   },
  //   resolveCssClassConflicts: (operation, appContext) => {
  //     undoResolveCssClassConflicts(operation, appContext);
  //   },
  //   resolveStyleDependencies: (operation, appContext) => {
  //     undoResolveStyleDependencies(operation, appContext);
  //   },
  //   optimizeImports: (operation, appContext) => {
  //     undoOptimizeImports(operation, appContext);
  //   },
};

function redoUpdateComponent(operation, appContext) {
  const { componentPath } = operation.target;

  const { componentCode } = operation.after;

  fs.writeFileSync(componentPath, componentCode, "utf8");

  return {
    success: true,
    componentPath,
  };
}

function redoMoveComponent(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths from operation
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve component name
  // ----------------------------------------------------------
  //
  // Example:
  //
  // ../../src/components/Header
  //
  // -> Header
  //
  // ----------------------------------------------------------

  const componentName = path.basename(sourcePath);

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure component exists at original location
  // ----------------------------------------------------------

  if (!fs.existsSync(sourcePath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component not found: ${sourcePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination directory exists
  // ----------------------------------------------------------

  fs.mkdirSync(destinationPath, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Build final moved location
  // ----------------------------------------------------------
  //
  // Example:
  //
  // destinationPath/Header
  //
  // ----------------------------------------------------------

  const movedComponentPath = path.join(destinationPath, componentName);

  // ----------------------------------------------------------
  // STEP 6:
  // Move component again
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, movedComponentPath);

  // ----------------------------------------------------------
  // STEP 7:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    movedPath: movedComponentPath,
  };
}
function redoRenameComponent(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract information from operation log.
  // ----------------------------------------------------------

  const { newComponentPath: componentPath } = operation.target;

  const { componentName: oldComponentName } = operation.before;

  const { componentName: newComponentName } = operation.after;

  // ----------------------------------------------------------
  // STEP 2:
  // Re-apply the original rename.
  // ----------------------------------------------------------

  const result = mutations.renameComponent(
    {
      componentPath,

      newComponentName,

      // Preserve the same behavior used
      // during the original rename.
      updateComponentCode: true,
    },
    appContext,
  );

  // ----------------------------------------------------------
  // STEP 3:
  // Validate redo.
  // ----------------------------------------------------------

  if (!result?.success) {
    throw new LoomaError(
      ERROR_CODES.REDO_FAILED,
      `Failed to redo renameComponent: ${oldComponentName} -> ${newComponentName}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Return result.
  // ----------------------------------------------------------

  return {
    success: true,

    componentPath,
  };
}
function redoCreateComponent(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract information from operation log
  // ----------------------------------------------------------

  const { componentName, componentCode, parentDirectory } = operation.after;

  // ----------------------------------------------------------
  // STEP 2:
  // Recreate component
  // ----------------------------------------------------------

  const result = mutations.createComponent(
    {
      componentName,

      componentCode,

      parentDirectory,
    },
    appContext,
  );

  // ----------------------------------------------------------
  // STEP 3:
  // Validate redo
  // ----------------------------------------------------------

  if (!result?.success) {
    throw new LoomaError(
      ERROR_CODES.REDO_FAILED,
      `Failed to redo createComponent: ${componentName}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,

    componentDirectoryPath: result.componentDirectoryPath,
  };
}
function redoDeleteComponent(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve original component path.
  //
  // Example:
  //
  // src/components/Home
  //
  // ----------------------------------------------------------

  const sourcePath = path.resolve(
    appContext.project.root,
    operation.target.componentDirectoryPath,
  );

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve trash location.
  //
  // Example:
  //
  // .looma-trash/1780467601246_Home
  //
  // ----------------------------------------------------------

  const destinationPath = path.resolve(
    appContext.project.root,
    operation.after.trashPath,
  );

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure trash parent directory exists.
  // ----------------------------------------------------------

  const trashParentDirectory = path.dirname(destinationPath);

  fs.mkdirSync(trashParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure component still exists.
  // ----------------------------------------------------------

  if (!fs.existsSync(sourcePath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component not found: ${sourcePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Move component back to trash.
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, destinationPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return redo result.
  // ----------------------------------------------------------

  return {
    success: true,

    sourcePath,

    destinationPath,
  };
}
// function redoInsertVariable(operation, appContext) {}
// function redoUpdateVariable(operation, appContext) {}
// function redoDeleteVariable(operation, appContext) {}
// function redoInsertCode(operation, appContext) {}
function redoExtractComponent(operation, appContext) {}
// function redoInsertJSX(operation, appContext) {}
// function redoReplaceJSX(operation, appContext) {}
// function redoRemoveJSX(operation, appContext) {}
// function redoMoveJSX(operation, appContext) {}
// function redoWrapJSX(operation, appContext) {}
function redoCreateFile(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract information from operation log
  // ----------------------------------------------------------

  const { filePath } = operation.target;

  const { fileContent } = operation.after;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(filePath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure file does not already exist
  // ----------------------------------------------------------

  if (fs.existsSync(filePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_ALREADY_EXISTS,
      `File already exists: ${filePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Recreate file
  // ----------------------------------------------------------

  fs.writeFileSync(filePath, fileContent, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    createdFile: filePath,
  };
}
function redoDeleteFile(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { originalPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(originalPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Original file not found: ${originalPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure trash parent directory exists
  // ----------------------------------------------------------

  const trashParentDirectory = path.dirname(trashPath);

  fs.mkdirSync(trashParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Move file back into trash
  // ----------------------------------------------------------

  fs.renameSync(originalPath, trashPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    deletedFile: originalPath,
  };
}
function redoRenameFile(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { oldFilePath, newFilePath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(oldFilePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Original file not found: ${oldFilePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure new parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(newFilePath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Rename file again
  // ----------------------------------------------------------

  fs.renameSync(oldFilePath, newFilePath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    renamedFile: newFilePath,
  };
}
function redoMoveFile(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract file paths
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original file exists
  // ----------------------------------------------------------

  if (!fs.existsSync(sourcePath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      `Original file not found: ${sourcePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve moved file path
  // ----------------------------------------------------------
  //
  // Example:
  //
  // sourcePath:
  // /src/tasks/helpers/api.js
  //
  // destinationPath:
  // /src/services
  //
  // moved file:
  // /src/services/api.js
  //
  // ----------------------------------------------------------

  const fileName = path.basename(sourcePath);

  const movedFilePath = path.join(destinationPath, fileName);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination directory exists
  // ----------------------------------------------------------

  fs.mkdirSync(destinationPath, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Move file again
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, movedFilePath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    movedFile: movedFilePath,
  };
}
function redoCreateDirectory(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths
  // ----------------------------------------------------------

  const { directoryPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure trashed directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(trashPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Directory not found in trash: ${trashPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure destination parent exists
  // ----------------------------------------------------------

  fs.mkdirSync(path.dirname(directoryPath), {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Restore directory
  // ----------------------------------------------------------

  fs.renameSync(trashPath, directoryPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,

    restoredDirectory: directoryPath,
  };
}
function redoDeleteDirectory(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract directory paths
  // ----------------------------------------------------------

  const { originalPath, trashPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(originalPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Original directory not found: ${originalPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure trash parent directory exists
  // ----------------------------------------------------------

  const trashParentDirectory = path.dirname(trashPath);

  fs.mkdirSync(trashParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Move directory back to trash
  // ----------------------------------------------------------

  fs.renameSync(originalPath, trashPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    deletedDirectory: originalPath,
  };
}
function redoRenameDirectory(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract directory paths
  // ----------------------------------------------------------

  const { oldDirectoryPath, newDirectoryPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(oldDirectoryPath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Original directory not found: ${oldDirectoryPath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure new parent directory exists
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(newDirectoryPath);

  fs.mkdirSync(parentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Reapply rename
  // ----------------------------------------------------------

  fs.renameSync(oldDirectoryPath, newDirectoryPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    renamedDirectory: newDirectoryPath,
  };
}
function redoMoveDirectory(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract paths
  // ----------------------------------------------------------

  const { sourcePath, destinationPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure original directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(sourcePath)) {
    throw new LoomaError(
      ERROR_CODES.DIRECTORY_NOT_FOUND,
      `Original directory not found: ${sourcePath}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Determine moved directory path
  // ----------------------------------------------------------
  //
  // Example:
  //
  // sourcePath:
  // src/components/Header
  //
  // destinationPath:
  // src/layout
  //
  // movedDirectoryPath:
  // src/layout/Header
  //
  // ----------------------------------------------------------

  const directoryName = path.basename(sourcePath);

  const movedDirectoryPath = path.join(destinationPath, directoryName);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination directory exists
  // ----------------------------------------------------------

  fs.mkdirSync(destinationPath, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Move directory again
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, movedDirectoryPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    movedDirectory: movedDirectoryPath,
  };
}
function redoUpdateStyles(operation, appContext) {
  try {
    // ----------------------------------------------------------
    // STEP 1:
    // Extract CSS file path
    // ----------------------------------------------------------

    const { cssPath } = operation.target;

    // ----------------------------------------------------------
    // STEP 2:
    // Extract original CSS content
    // ----------------------------------------------------------

    const originalCss = operation.before.cssCode;
    const newCss = operation.after.cssCode;

    // ----------------------------------------------------------
    // STEP 3:
    // Ensure rollback snapshot exists
    // ----------------------------------------------------------

    if (typeof newCss !== "string") {
      throw new LoomaError(
        ERROR_CODES.CSS_NOT_FOUND,
        "Missing new CSS code for Redo.",
      );
    }

    // ----------------------------------------------------------
    // STEP 4:
    // Restore original CSS content
    // ----------------------------------------------------------

    fs.writeFileSync(cssPath, newCss, "utf8");
    // ----------------------------------------------------------
    // STEP 5:
    // Return rollback result
    // ----------------------------------------------------------

    return {
      success: true,

      newCssFile: cssPath,
    };
  } catch (error) {
    return {
      success: false,
      error,
    };
  }
}
function redoRemoveStyles(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract CSS file path
  // ----------------------------------------------------------

  const { cssPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract CSS snapshot after removal
  // ----------------------------------------------------------

  const removedCss = operation.after.cssCode;

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure redo snapshot exists
  // ----------------------------------------------------------

  if (typeof removedCss !== "string") {
    throw new LoomaError(
      ERROR_CODES.CSS_NOT_FOUND,
      "Missing CSS code for redo.",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Reapply removed styles
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, removedCss, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Return redo result
  // ----------------------------------------------------------

  return {
    success: true,

    updatedCssFile: cssPath,
  };
}
function redoRenameCssClass(operation, appContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract target files
  // ----------------------------------------------------------

  const { cssPath, componentJSXPath } = operation.target;

  // ----------------------------------------------------------
  // STEP 2:
  // Extract updated contents
  // ----------------------------------------------------------

  const { cssCode, jsxCode } = operation.after;

  // ----------------------------------------------------------
  // STEP 3:
  // Validate snapshots
  // ----------------------------------------------------------

  if (typeof cssCode !== "string") {
    throw new LoomaError(
      ERROR_CODES.CSS_NOT_FOUND,
      "Missing cssCode in operation.after",
    );
  }

  if (typeof jsxCode !== "string") {
    throw new LoomaError(
      ERROR_CODES.JSX_NOT_FOUND,
      "Missing jsxCode in operation.after",
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Reapply CSS changes
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, cssCode, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Reapply JSX changes
  // ----------------------------------------------------------

  fs.writeFileSync(componentJSXPath, jsxCode, "utf8");

  // ----------------------------------------------------------
  // STEP 6:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,

    cssPath,

    componentJSXPath,
  };
}

const redoHandlers = {
  //   normalizeComponent: (operation, appContext) => {
  //redoNormalizeComponent(operation, appContext);
  //   },
  updateComponent: (operation, appContext) => {
    redoUpdateComponent(operation, appContext);
  },
  moveComponent: (operation, appContext) => {
    redoMoveComponent(operation, appContext);
  },
  renameComponent: (operation, appContext) => {
    redoRenameComponent(operation, appContext);
  },
  createComponent: (operation, appContext) => {
    redoCreateComponent(operation, appContext);
  },
  deleteComponent: (operation, appContext) => {
    redoDeleteComponent(operation, appContext);
  },
  // insertVariable: (operation, appContext) => {
  //   redoInsertVariable(operation, appContext);
  // },
  // updateVariable: (operation, appContext) => {
  //   redoUpdateVariable(operation, appContext);
  // },
  // deleteVariable: (operation, appContext) => {
  //   redoDeleteVariable(operation, appContext);
  // },
  // insertCode: (operation, appContext) => {
  //   redoInsertCode(operation, appContext);
  // },
  extractComponent: (operation, appContext) => {
    redoExtractComponent(operation, appContext);
  },
  // insertJSX: (operation, appContext) => {
  //   redoInsertJSX(operation, appContext);
  // },
  // replaceJSX: (operation, appContext) => {
  //   redoReplaceJSX(operation, appContext);
  // },
  // removeJSX: (operation, appContext) => {
  //   redoRemoveJSX(operation, appContext);
  // },
  // moveJSX: (operation, appContext) => {
  //   redoMoveJSX(operation, appContext);
  // },
  // wrapJSX: (operation, appContext) => {
  //   redoWrapJSX(operation, appContext);
  // },
  createFile: (operation, appContext) => {
    redoCreateFile(operation, appContext);
  },
  deleteFile: (operation, appContext) => {
    redoDeleteFile(operation, appContext);
  },
  renameFile: (operation, appContext) => {
    redoRenameFile(operation, appContext);
  },
  moveFile: (operation, appContext) => {
    redoMoveFile(operation, appContext);
  },
  createDirectory: (operation, appContext) => {
    redoCreateDirectory(operation, appContext);
  },
  deleteDirectory: (operation, appContext) => {
    redoDeleteDirectory(operation, appContext);
  },
  renameDirectory: (operation, appContext) => {
    redoRenameDirectory(operation, appContext);
  },
  moveDirectory: (operation, appContext) => {
    redoMoveDirectory(operation, appContext);
  },
  // insertStyles: (operation, appContext) => {
  //   redoInsertStyles(operation, appContext);
  // },
  updateStyles: (operation, appContext) => {
    redoUpdateStyles(operation, appContext);
  },
  removeStyles: (operation, appContext) => {
    redoRemoveStyles(operation, appContext);
  },
  renameCssClass: (operation, appContext) => {
    redoRenameCssClass(operation, appContext);
  },
  //   syncComponentStyles: (operation, appContext) => {
  //     rollbackSyncComponentStyles(operation, appContext);
  //   },
  //   resolveCssClassConflicts: (operation, appContext) => {
  //     rollbackResolveCssClassConflicts(operation, appContext);
  //   },
  //   resolveStyleDependencies: (operation, appContext) => {
  //     rollbackResolveStyleDependencies(operation, appContext);
  //   },
  //   optimizeImports: (operation, appContext) => {
  //     rollbackOptimizeImports(operation, appContext);
  //   },
};

export default {
  // rollbackHandlers,
  operationSerializers,
  undoHandlers,
  redoHandlers,
};
