/* 

Commit Tasks: Anything that writes a file,
changes package.json,
moves directories,
or changes project structure. Can be rolled back.
------------
createComponent - Creates a new component directory and its associated files.
deleteComponent - Removes a component by moving its directory to trash.
moveComponent - Moves a component directory to a different location.
renameComponent - Renames a component and optionally updates its code references.
extractComponent - Extracts JSX into a new standalone component.
createFile - Creates a new file in an existing directory.
deleteFile - Removes a file by moving it to trash.
renameFile - Renames an existing file.
moveFile - Moves a file to another existing directory.
createDirectory - Creates a new directory in an existing parent directory.
deleteDirectory - Removes a directory by moving it to trash.
renameDirectory - Renames an existing directory.
moveDirectory - Moves a directory to another existing location.

*/

import fs, { write } from "fs";
import path from "path";
import traverse from "@babel/traverse";
import { parse, parseExpression } from "@babel/parser";
import { generate } from "@babel/generator";
import t from "@babel/types";
import postcss from "postcss";
// import safeParser from "postcss-safe-parser";
import {
  type TaskPayload,
  type TaskReturn,
  type TaskResponse,
  ERROR_CODES,
  type ExecutionContext,
  AppContext,
} from "../../schemas/index.js";

import utils from "../../execute/helpers/general.js";
import { LoomaError } from "../../server/error.js";

import helpers from "../../execute/helpers/general.js";

// import type {
//   TaskResponse,
//   TaskRegistry,
//   TaskResult,
//   TaskPayload,
// } from "../../types";

/**
 * DescriptionForPrompt: Creates a new file in an existing directory.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function creates a new file and optionally writes
 * initial content into it.
 *
 * Example:
 *
 * createFile({
 *   filePath: "src/components/Header.jsx",
 *   content: "function Header() {}"
 * })
 *
 * RESULT:
 *
 * - creates missing directories if needed
 * - creates Header.jsx
 * - writes content into file
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In AI-powered frontend systems,
 * component/code generation usually requires:
 *
 * - creating component files
 * - creating utility files
 * - creating stylesheets
 * - creating config files
 *
 * This function becomes the base filesystem primitive.
 *
 * Useful commands:
 * - create header component: createFile(Header.jsx)
 * - make navbar file: createFile(Navbar.jsx)
 * - create utility file: createFile(utils.js)
 * - add stylesheet: createFile(styles.css)
 * - create auth service: createFile(authService.js)
 * 
 * createComponent
    ↓
createFile
    ↓
ensureImport
    ↓
insertJSX
 * 
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * createFile should ONLY:
 *
 * - create directories
 * - create/write file
 *
 * It should NOT:
 *
 * - generate code
 * - manipulate AST
 * - insert JSX
 * - optimize imports
 *
 * Those belong to separate primitives.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Most higher-level UI operations eventually require:
 *
 * - physical file creation
 *
 * Example:
 *
 * "create navbar"
 *
 * usually becomes:
 *
 * createComponent()
 *      ↓
 * createFile()
 *
 * ------------------------------------------------------------
 * DIRECTORY BEHAVIOR
 * ------------------------------------------------------------
 *
 * If parent directories do not exist,
 * they are automatically created.
 *
 * Example:
 *
 * src/components/layout/Header.jsx
 *
 * If:
 *
 * src/components/layout
 *
 * does not exist,
 * it will be created automatically.
 *
 * ------------------------------------------------------------
 * OVERWRITE STRATEGY
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - overwrites existing file
 *
 * Future improvements:
 *
 * - prevent overwrite
 * - merge content
 * - backup old file
 * - diff-based updates
 *
 * ------------------------------------------------------------
 * ENCODING
 * ------------------------------------------------------------
 *
 * Files are written using UTF-8 encoding.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.filePath
 * Full file path.
 *
 * Example:
 * "src/components/Header.jsx"
 *
 * @param {string=} params.content
 * Initial file content.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
*   success: boolean,
*   filePath: string
* }}
*
*/
function createFile(
  { filePath, content = "" }: TaskPayload<"createFile">,
  appContext: AppContext
): TaskResponse<TaskReturn<"createFile">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve parent directory path
  //
  // Example:
  //
  // src/components/Header.jsx
  //
  // becomes:
  //
  // src/components
  // ----------------------------------------------------------

  const directoryPath = path.dirname(filePath);

  // ----------------------------------------------------------
  // STEP 2:
  // Check if parent directories exist
  //
  // ----------------------------------------------------------

  const directoryExists = fs.existsSync(directoryPath);

  if (!directoryExists) {
    return {
      success: false,
      message: "Parent directory does not exist",
      filePath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Create/write file
  //
  // UTF-8 ensures proper text encoding.
  // ----------------------------------------------------------

  fs.writeFileSync(filePath, content, "utf8");

  // ----------------------------------------------------------
  // STEP 4:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Created file: ${path.basename(filePath)}`,
    filePath,
  };
}

/**
* DescriptionForPrompt: Removes a file by moving it to trash.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function removes a file from the filesystem.
*
* Example:
*
* BEFORE:
*
* src/components/Header.jsx
*
* AFTER:
*
* <deleted>
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered frontend systems,
* users frequently ask to:
*
* - remove components
* - delete pages
* - remove utility files
* - delete stylesheets
* - remove configs
*
* Eventually all of those actions require:
*
* physical file deletion.
*
* Useful commands:
* - delete header component: deleteFile(Header.jsx)
* - remove navbar file: deleteFile(Navbar.jsx)
* - delete auth service: deleteFile(authService.js)
* - remove stylesheet: deleteFile(styles.css)
* - delete unused utility file: deleteFile(utils.js)
*
* removeJSX
   ↓
removeImport
   ↓
optimizeImports
   ↓
deleteFile
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* deleteFile should ONLY:
*
* - delete filesystem file
*
* It should NOT:
*
* - remove imports
* - update JSX
* - clean routes
* - optimize imports
* - update references
*
* Those belong to separate primitives.
*
* ------------------------------------------------------------
* EXAMPLE PIPELINE
* ------------------------------------------------------------
*
* "remove navbar"
*
* usually becomes:
*
* removeJSX()
*      ↓
* removeImport()
*      ↓
* optimizeImports()
*      ↓
* deleteFile()
*
* ------------------------------------------------------------
* SAFETY BEHAVIOR
* ------------------------------------------------------------
*
* Current implementation:
*
* - checks file existence before deletion
*
* WHY?
*
* Prevent runtime crash when file does not exist.
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - deletes files only
*
* NOT:
*
* - directories
*
* Directory deletion should be handled separately.
*
* ------------------------------------------------------------
* FUTURE IMPROVEMENTS
* ------------------------------------------------------------
*
* Possible future features:
*
* - soft delete
* - recycle bin
* - backup before deletion
* - dependency analysis
* - reference cleanup
*
* ------------------------------------------------------------
* PARAMS
* ------------------------------------------------------------
*
* @param {Object} params
*
* @param {string} params.filePath
* Full file path to delete.
*
* Example:
* "src/components/Header.jsx"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{
*   success: boolean,
*   filePath: string
*   trashPath: string
* }}
*
*/
function deleteFile(
  { filePath }: TaskPayload<"deleteFile">,
  appContext: AppContext
): TaskResponse<TaskReturn<"deleteFile">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Check whether file exists
  //
  // WHY?
  //
  // Prevent deleting non-existing file.
  // ----------------------------------------------------------

  const fileExists = fs.existsSync(filePath);

  // ----------------------------------------------------------
  // STEP 2:
  // If file does not exist:
  // return safely
  // ----------------------------------------------------------

  if (!fileExists) {
    return {
      success: false,
      message: "file doesn't exist",
      filePath,
      trashPath: null,
    };
  }

  // ----------------------------------------------------------
  // Create trash directory if missing
  // ----------------------------------------------------------

  const trashDirectory = appContext.project.trashDir;

  fs.mkdirSync(trashDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // Create unique trash file path
  // ----------------------------------------------------------

  const fileName = path.basename(filePath);

  const trashPath = path.join(trashDirectory, `${Date.now()}_${fileName}`);

  // ----------------------------------------------------------
  // Move file to trash
  // ----------------------------------------------------------

  fs.renameSync(filePath, trashPath);

  // ----------------------------------------------------------
  // STEP 3:
  // Delete file from filesystem
  // ----------------------------------------------------------

  // fs.unlinkSync(filePath);

  // ----------------------------------------------------------
  // STEP 4:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Deleted file: ${fileName}`,
    filePath,
    trashPath,
  };
}

/**
* DescriptionForPrompt: Renames a component and optionally updates its code references.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function changes the name and/or location of a file.
*
* Example:
*
* BEFORE:
*
* src/components/Header.jsx
*
* AFTER:
*
* src/components/Navbar.jsx
*
* ------------------------------------------------------------
* IMPORTANT NOTE
* ------------------------------------------------------------
*
* Renaming and moving are technically the same filesystem
* operation.
*
* Example:
*
* OLD:
*
* src/Header.jsx
*
* NEW:
*
* src/layout/Header.jsx
*
* This is both:
*
* - rename
* - move
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In AI-powered frontend systems,
* users frequently ask:
*
* - "rename header to navbar"
* - "move component into layout folder"
* - "rename utils file"
* - "move auth service"
*
* Eventually these commands require:
*
* filesystem rename operation.
*
* Useful commands:
* - rename header to navbar: renameFile(Header.jsx → Navbar.jsx)
* - move header into layout folder: renameFile(move path)
* - rename auth service: renameFile(auth.js → authService.js)
* - move utils file into shared folder: renameFile(utils.js → shared/tasks/helpers.js)
* - rename styles file: renameFile(styles.css → app.css)
* 
* renameFile
   ↓
updateImport
   ↓
optimizeImports
* 
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* renameFile should ONLY:
*
* - rename/move filesystem file
*
* It should NOT:
*
* - update imports
* - update JSX usages
* - rename component declarations
* - optimize imports
*
* Those belong to separate primitives.
*
* ------------------------------------------------------------
* EXAMPLE PIPELINE
* ------------------------------------------------------------
*
* "rename Header to Navbar"
*
* usually becomes:
*
* renameComponent()
*      ↓
* renameFile()
*      ↓
* updateImport()
*      ↓
* optimizeImports()
*
* ------------------------------------------------------------
* SAFETY BEHAVIOR
* ------------------------------------------------------------
*
* Current implementation:
*
* - checks old file existence
* - creates destination directories automatically
*
* WHY?
*
* Prevent runtime crashes.
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - overwrites destination if already exists
*
* Future improvements:
*
* - collision prevention
* - backup old file
* - safe rename mode
* - dependency graph updates
*
* ------------------------------------------------------------
* PARAMS
* ------------------------------------------------------------
*
* @param {Object} params
*
* @param {string} params.oldFilePath
* Existing file path.
*
* Example:
* "src/components/Header.jsx"
*
* @param {string} params.newFilePath
* New file path.
*
* Example:
* "src/components/Navbar.jsx"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{
*   success: boolean,
*   oldFilePath: string,
*   newFilePath: string
* }}
*
*/
function renameFile(
  { oldFilePath, newFilePath }: TaskPayload<"renameFile">,
  appContext: AppContext
): TaskResponse<TaskReturn<"renameFile">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Check whether source file exists
  //
  // WHY?
  //
  // Prevent renaming non-existing file.
  // ----------------------------------------------------------

  const fileExists = fs.existsSync(oldFilePath);

  // ----------------------------------------------------------
  // STEP 2:
  // If source file does not exist:
  // return safely
  // ----------------------------------------------------------

  if (!fileExists) {
    return {
      success: false,
      message: "file doesn't exist",
      oldFilePath,
      newFilePath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve destination directory
  //
  // Example:
  //
  // src/layout/Navbar.jsx
  //
  // becomes:
  //
  // src/layout
  // ----------------------------------------------------------

  const destinationDirectory = path.dirname(newFilePath);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination directory exists
  //
  // recursive: true
  //
  // allows nested directory creation.
  // ----------------------------------------------------------

  fs.mkdirSync(destinationDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Rename/move file
  //
  // This operation:
  //
  // - renames file
  // OR
  // - moves file
  // OR
  // - both
  // ----------------------------------------------------------

  fs.renameSync(oldFilePath, newFilePath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Renamed: ${path.basename(oldFilePath)} to ${path.basename(newFilePath)}`,
    oldFilePath,
    newFilePath,
  };
}

/**
* DescriptionForPrompt: Moves a file to another existing directory.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function relocates a file into another directory.
*
* Example:
*
* BEFORE:
*
* src/components/Header.jsx
*
* AFTER:
*
* src/layout/Header.jsx
*
* ------------------------------------------------------------
* IMPORTANT NOTE
* ------------------------------------------------------------
*
* Technically:
*
* moving a file is internally the same as renaming.
*
* Example:
*
* fs.renameSync(oldPath, newPath)
*
* performs BOTH:
*
* - rename
* - move
*
* ------------------------------------------------------------
* WHY HAVE A SEPARATE moveFile FUNCTION?
* ------------------------------------------------------------
*
* Architectural clarity.
*
* AI planners should distinguish:
*
* renameFile
* → semantic rename intent
*
* moveFile
* → structural relocation intent
*
* Example:
*
* "rename Header to Navbar"
*
* is NOT the same as:
*
* "move Header into layout folder"
*
* Even though filesystem operation is same.
*
* ------------------------------------------------------------
* WHY THIS FUNCTION EXISTS
* ------------------------------------------------------------
*
* In frontend architecture systems,
* users frequently ask:
*
* - "move header into layout"
* - "move auth service into services"
* - "organize components folder"
* - "move utils into shared"
*
* These are structural refactor commands.
*
* Useful commands:
* - move header into layout folder: moveFile(Header.jsx → layout/Header.jsx)
* - move auth service into services: moveFile(auth.js → services/auth.js)
* - organize utils into shared folder: moveFile(utils.js → shared/tasks/helpers.js)
* - move navbar into common components: moveFile(Navbar.jsx → components/common/Navbar.jsx)
* - move styles into theme folder: moveFile(styles.css → theme/styles.css)
* 
* moveFile
   ↓
updateImport
   ↓
optimizeImports
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* moveFile should ONLY:
*
* - move filesystem file
*
* It should NOT:
*
* - update imports
* - update aliases
* - optimize imports
* - rename components
* - rewrite routes
*
* Those belong to separate primitives.
*
* ------------------------------------------------------------
* EXAMPLE PIPELINE
* ------------------------------------------------------------
*
* "move Header into layout folder"
*
* usually becomes:
*
* moveFile()
*      ↓
* updateImport()
*      ↓
* optimizeImports()
*
* ------------------------------------------------------------
* SAFETY BEHAVIOR
* ------------------------------------------------------------
*
* Current implementation:
*
* - checks source file existence
* - creates destination directories automatically
*
* WHY?
*
* Prevent runtime crashes.
*
* ------------------------------------------------------------
* IMPORTANT LIMITATION
* ------------------------------------------------------------
*
* Current implementation:
*
* - overwrites destination if already exists
*
* Future improvements:
*
* - collision prevention
* - dependency graph updates
* - import auto-rewrite
* - safe move mode
*
* ------------------------------------------------------------
* PARAMS
* ------------------------------------------------------------
*
* @param {Object} params
*
* @param {string} params.sourcePath
* Existing file path.
*
* Example:
* "src/components/Header.jsx"
*
* @param {string} params.destinationPath
* New destination path.
*
* Example:
* "src/layout/Header.jsx"
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{
*   success: boolean,
*   sourcePath: string,
*   destinationPath: string
* }}
*
*/
function moveFile(
  { fileName, sourcePath, destinationPath }: TaskPayload<"moveFile">,
  appContext: AppContext
): TaskResponse<TaskReturn<"moveFile">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Verify that the source file exists.
  //
  // There is nothing to move if the source
  // file cannot be found.
  // ----------------------------------------------------------

  const fileExists = fs.existsSync(path.join(sourcePath, fileName));

  if (!fileExists) {
    return {
      success: false,

      message: "Source file does not exist",
      fileName,
      sourcePath,
      destinationPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Find the destination directory.
  //
  // Example:
  //
  // destinationPath:
  // src/components/Header.jsx
  //
  // destinationDirectory:
  // src/components
  // ----------------------------------------------------------

  const destinationDirectory = path.dirname(destinationPath);

  // ----------------------------------------------------------
  // STEP 3:
  // Verify that the destination directory
  // already exists.
  //
  // moveFile is intentionally strict.
  //
  // It should NOT create directories.
  //
  // Directory creation must be handled
  // explicitly through createDirectory.
  // ----------------------------------------------------------

  const destinationDirectoryExists = fs.existsSync(destinationDirectory);

  if (!destinationDirectoryExists) {
    return {
      success: false,

      message: "Destination directory does not exist",
      fileName,
      sourcePath,
      destinationPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Prevent accidental overwrite.
  //
  // If a file already exists at the target
  // location we fail instead of replacing it.
  // ----------------------------------------------------------

  const destinationFileExists = fs.existsSync(
    path.join(destinationPath, fileName)
  );

  if (destinationFileExists) {
    return {
      success: false,

      message: "Destination file already exists",
      fileName,
      sourcePath,
      destinationPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Move the file.
  //
  // renameSync performs a filesystem move
  // when source and destination differ.
  // ----------------------------------------------------------

  fs.renameSync(sourcePath, destinationPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return result.
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Moved file from ${sourcePath} to ${destinationPath}`,
    fileName,
    sourcePath,
    destinationPath,
  };
}

/**
 * DescriptionForPrompt: Creates a new directory in an existing parent directory.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function creates a directory structure.
 *
 * Example:
 *
 * await createDirectory({
    directoryPath: "../../src/components",
    dirName: "Hero",
  })
 *
 * RESULT:
 *
 * src/
 *   components/
 *     layout/
 *
 * gets created automatically.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In AI-powered frontend systems,
 * users frequently ask:
 *
 * - "create layout folder"
 * - "make components directory"
 * - "add services folder"
 * - "organize project structure"
 *
 * All these operations eventually require:
 *
 * filesystem directory creation.
 *
 * Useful commands:
 * - create layout folder: createDirectory(layout)
 * - make components directory: createDirectory(components)
 * - create services folder: createDirectory(services)
 * - add auth module structure: createDirectory(auth)
 * - organize project folders: createDirectory(...)
 * 
 * createDirectory
    ↓
createFile
    ↓
createComponent
 * 
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * createDirectory should ONLY:
 *
 * - create directory structure
 *
 * It should NOT:
 *
 * - create files
 * - generate code
 * - move files
 * - update imports
 * - manipulate JSX
 *
 * Those belong to separate primitives.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION IS IMPORTANT
 * ------------------------------------------------------------
 *
 * Many higher-level operations depend on folders existing.
 *
 * Example:
 *
 * "create auth module"
 *
 * may internally become:
 *
 * createDirectory()
 *      ↓
 * createFile()
 *      ↓
 * createComponent()
 *
 * ------------------------------------------------------------
 * RECURSIVE CREATION
 * ------------------------------------------------------------
 *
 * recursive: true
 *
 * allows automatic nested directory creation.
 *
 * Example:
 *
 * src/modules/auth/components
 *
 * gets created entirely even if:
 *
 * src/modules
 *
 * does not exist yet.
 *
 * ------------------------------------------------------------
 * SAFETY BEHAVIOR
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - safely succeeds if folder already exists
 *
 * WHY?
 *
 * mkdirSync with recursive=true is idempotent.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - only creates directories
 *
 * NOT:
 *
 * - files
 * - starter templates
 * - index files
 *
 * Future improvements:
 *
 * - scaffold generation
 * - feature module creation
 * - boilerplate generation
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 * @param {string} params.directoryPath - The relative path from the project root (e.g., './src/components')
 * @returns {{
 * success: boolean, 
 * directoryPath: string
 * }}
 *
 */
function createDirectory(
  { directoryPath }: TaskPayload<"createDirectory">,
  appContext: AppContext
): TaskResponse<TaskReturn<"createDirectory">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Find the parent directory.
  //
  // Example:
  //
  // directoryPath:
  // src/components/Header
  //
  // parentDirectory:
  // src/components
  //
  // We use dirname because createDirectory is strict
  // and should only create one directory at a time.
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(directoryPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Verify that the parent directory already exists.
  //
  // We intentionally do NOT use:
  //
  // mkdirSync(path, { recursive: true })
  //
  // because we want the planner to explicitly create
  // every directory in the hierarchy.
  //
  // Good:
  // createDirectory("src")
  // createDirectory("src/components")
  // createDirectory("src/components/Header")
  //
  // Bad:
  // createDirectory("src/components/Header")
  // when src/components does not exist.
  // ----------------------------------------------------------

  const parentExists = fs.existsSync(parentDirectory);

  if (!parentExists) {
    return {
      success: false,

      message: "Parent directory does not exist",

      directoryPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Prevent accidental recreation.
  //
  // If the directory already exists,
  // there is nothing to create.
  // ----------------------------------------------------------

  const directoryExists = fs.existsSync(directoryPath);

  if (directoryExists) {
    return {
      success: true,

      message: "Directory already exists",

      directoryPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Create the directory.
  //
  // No recursive creation.
  // Only the requested directory is created.
  // ----------------------------------------------------------

  fs.mkdirSync(directoryPath);

  // ----------------------------------------------------------
  // STEP 5:
  // Return result.
  //
  // The caller may use this path for rollback
  // or further operations.
  // ----------------------------------------------------------

  return {
    success: true,

    message: `Create new directory at ${directoryPath}`,

    directoryPath,
  };
}

/**
 * DescriptionForPrompt: Removes a directory by moving it to trash.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function removes an entire directory.
 *
 * It can remove:
 *
 * - empty folders
 * - folders containing files
 * - nested folder structures
 *
 * Example:
 *
 * BEFORE:
 *
 * src/components/auth/
 *   Login.jsx
 *   Signup.jsx
 *
 * AFTER:
 *
 * <deleted>
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In AI-powered frontend systems,
 * users frequently ask:
 *
 * - "remove auth module"
 * - "delete layout folder"
 * - "remove unused feature"
 * - "cleanup project structure"
 *
 * All these operations eventually require:
 *
 * filesystem directory deletion.
 *
 * Useful commands:
 * - delete auth folder: deleteDirectory(auth)
 * - remove unused module: deleteDirectory(module)
 * - delete layout directory: deleteDirectory(layout)
 * - cleanup old feature folder: deleteDirectory(feature)
 * - remove legacy components folder: deleteDirectory(legacy)
 * 
 * removeJSX
      ↓
  removeImport
      ↓
  optimizeImports
      ↓
  deleteDirectory
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * deleteDirectory should ONLY:
 *
 * - remove directory structure
 *
 * It should NOT:
 *
 * - update imports
 * - remove JSX usages
 * - cleanup routes
 * - optimize imports
 * - analyze dependencies
 *
 * Those belong to separate primitives.
 *
 * ------------------------------------------------------------
 * IMPORTANT WARNING
 * ------------------------------------------------------------
 *
 * This function can delete:
 *
 * - ALL nested files
 * - ALL nested directories
 *
 * recursively.
 *
 * Example:
 *
 * deleteDirectory("src/auth")
 *
 * removes EVERYTHING inside auth.
 *
 * ------------------------------------------------------------
 * EXAMPLE PIPELINE
 * ------------------------------------------------------------
 *
 * "remove auth module"
 *
 * usually becomes:
 *
 * removeJSX()
 *      ↓
 * removeImport()
 *      ↓
 * optimizeImports()
 *      ↓
 * deleteDirectory()
 *
 * ------------------------------------------------------------
 * RECURSIVE DELETION
 * ------------------------------------------------------------
 *
 * recursive: true
 *
 * enables nested deletion.
 *
 * Example:
 *
 * auth/
 *   pages/
 *   hooks/
 *   utils/
 *
 * entire structure gets deleted automatically.
 *
 * ------------------------------------------------------------
 * FORCE OPTION
 * ------------------------------------------------------------
 *
 * force: true
 *
 * prevents runtime crashes if folder does not exist.
 *
 * WHY?
 *
 * Makes operation safer for automation pipelines.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - permanently deletes directories
 *
 * Future improvements:
 *
 * - recycle bin
 * - backup system
 * - dependency graph cleanup
 * - safe delete mode
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.directoryPath
 * Directory path to delete.
 *
 * Example:
 * "src/components/auth"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   directoryPath: string
 *  trashPath: string
 * }}
 *
 */
function deleteDirectory(
  { directoryPath }: TaskPayload<"deleteDirectory">,
  appContext: AppContext
): TaskResponse<TaskReturn<"deleteDirectory">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve directory path
  // ----------------------------------------------------------

  const fullPath = path.resolve(appContext.project.root, directoryPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Ensure directory exists
  // ----------------------------------------------------------

  if (!fs.existsSync(fullPath)) {
    return {
      success: false,
      message: "Directory does not exist",
      directoryPath,
      trashPath: null,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Create trash directory
  // ----------------------------------------------------------

  const { trashDir } = appContext.project;

  fs.mkdirSync(trashDir, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Create unique trash path
  // ----------------------------------------------------------

  const directoryName = path.basename(fullPath);

  const absoluteTrashPath = path.join(
    trashDir,
    `${Date.now()}_${directoryName}`
  );

  // ----------------------------------------------------------
  // STEP 5:
  // Move directory to trash
  // ----------------------------------------------------------

  fs.renameSync(fullPath, absoluteTrashPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Convert trash path back to relative path
  //
  // Example:
  //
  // /project/.looma-trash/123_Home
  //
  // ->
  //
  // .looma-trash/123_Home
  // ----------------------------------------------------------

  const relativeTrashPath = path.relative(
    appContext.project.root,
    absoluteTrashPath
  );

  // ----------------------------------------------------------
  // STEP 7:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,

    message: `Deleted directory at ${directoryPath}`,

    directoryPath,

    trashPath: relativeTrashPath,
  };
}

/**
 * DescriptionForPrompt: Renames an existing directory.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function changes the name and/or location
 * of an existing directory.
 *
 * Example:
 *
 * BEFORE:
 *
 * src/components/common
 *
 * AFTER:
 *
 * src/components/shared
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Internally:
 *
 * renaming a directory and moving a directory
 * are technically the same filesystem operation.
 *
 * Example:
 *
 * fs.renameSync(oldPath, newPath)
 *
 * performs BOTH:
 *
 * - rename
 * - move
 *
 * ------------------------------------------------------------
 * WHY HAVE A SEPARATE renameDirectory FUNCTION?
 * ------------------------------------------------------------
 *
 * Architectural clarity.
 *
 * AI planners should distinguish:
 *
 * renameDirectory
 * → semantic rename intent
 *
 * moveDirectory
 * → structural relocation intent
 *
 * Example:
 *
 * "rename common folder to shared"
 *
 * is NOT the same as:
 *
 * "move common folder into core"
 *
 * even though filesystem operation is same.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In frontend architecture systems,
 * users frequently ask:
 *
 * - "rename components folder"
 * - "rename common to shared"
 * - "rename feature module"
 * - "rename auth directory"
 *
 * These are structural refactor operations.
 *
 * Useful commands:
 * - rename common folder to shared: renameDirectory(common → shared)
 * - rename auth module to identity: renameDirectory(auth → identity)
 * - rename components folder: renameDirectory(components)
 * - rename legacy module: renameDirectory(legacy)
 * - rename ui folder to design-system: renameDirectory(ui → design-system)
 * 
 * renameDirectory
      ↓
  updateImportPaths
      ↓
  optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * renameDirectory should ONLY:
 *
 * - rename/move directory
 *
 * It should NOT:
 *
 * - rewrite imports
 * - update aliases
 * - update routes
 * - optimize imports
 * - rewrite file references
 *
 * Those belong to separate primitives.
 *
 * ------------------------------------------------------------
 * EXAMPLE PIPELINE
 * ------------------------------------------------------------
 *
 * "rename common folder to shared"
 *
 * usually becomes:
 *
 * renameDirectory()
 *      ↓
 * updateImportPaths()
 *      ↓
 * optimizeImports()
 *
 * ------------------------------------------------------------
 * SAFETY BEHAVIOR
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - checks source directory existence
 * - creates destination parent directories automatically
 *
 * WHY?
 *
 * Prevent runtime crashes.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - overwrites destination if already exists
 *
 * Future improvements:
 *
 * - collision prevention
 * - dependency graph updates
 * - alias auto-rewrite
 * - safe rename mode
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.oldDirectoryPath
 * Existing directory path.
 *
 * Example:
 * "src/components/common"
 *
 * @param {string} params.newDirectoryPath
 * New directory path.
 *
 * Example:
 * "src/components/shared"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   oldDirectoryPath: string,
 *   newDirectoryPath: string
 * }}
 *
 */
function renameDirectory(
  { oldDirectoryPath, newDirectoryPath }: TaskPayload<"renameDirectory">,
  appContext: AppContext
): TaskResponse<TaskReturn<"renameDirectory">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Check whether source directory exists
  //
  // WHY?
  //
  // Prevent renaming non-existing directory.
  // ----------------------------------------------------------

  const directoryExists = fs.existsSync(oldDirectoryPath);

  // ----------------------------------------------------------
  // STEP 2:
  // If source directory does not exist:
  // return safely
  // ----------------------------------------------------------

  if (!directoryExists) {
    return {
      success: false,
      message: "directory doesn't exist",
      oldDirectoryPath,
      newDirectoryPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve destination parent directory
  //
  // Example:
  //
  // src/core/shared
  //
  // becomes:
  //
  // src/core
  // ----------------------------------------------------------

  const destinationParentDirectory = path.dirname(newDirectoryPath);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination parent directory exists
  //
  // recursive: true
  //
  // allows nested folder creation.
  // ----------------------------------------------------------

  fs.mkdirSync(destinationParentDirectory, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Rename/move directory
  //
  // Internally this uses rename operation.
  // ----------------------------------------------------------

  fs.renameSync(oldDirectoryPath, newDirectoryPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Renamed directory from ${oldDirectoryPath} to ${newDirectoryPath}`,
    oldDirectoryPath,
    newDirectoryPath,
  };
}

/**
 * DescriptionForPrompt: Moves a directory to another existing location.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function relocates an entire directory structure
 * into another location.
 *
 * Example:
 *
 * BEFORE:
 *
 * src/components/auth
 *
 * AFTER:
 *
 * src/modules/auth
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Internally:
 *
 * moving a directory and renaming a directory
 * are technically the same filesystem operation.
 *
 * Example:
 *
 * fs.renameSync(oldPath, newPath)
 *
 * performs BOTH:
 *
 * - rename
 * - move
 *
 * ------------------------------------------------------------
 * WHY HAVE A SEPARATE moveDirectory FUNCTION?
 * ------------------------------------------------------------
 *
 * Architectural clarity.
 *
 * AI planners should distinguish:
 *
 * renameDirectory
 * → semantic rename intent
 *
 * moveDirectory
 * → structural relocation intent
 *
 * Example:
 *
 * "rename auth to identity"
 *
 * is NOT the same as:
 *
 * "move auth into modules"
 *
 * even though filesystem operation is same.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * In frontend architecture systems,
 * users frequently ask:
 *
 * - "move auth into modules"
 * - "organize components folder"
 * - "move shared folder into core"
 * - "move services into infrastructure"
 *
 * These are structural architecture refactors.
 *
 * Useful commands:
 * - move auth into modules: moveDirectory(auth → modules/auth)
 * - move shared folder into core: moveDirectory(shared → core/shared)
 * - organize feature folders: moveDirectory(...)
 * - move services into infrastructure: moveDirectory(services → infrastructure/services)
 * - move ui folder into design-system: moveDirectory(ui → design-system/ui)
 *
 * moveDirectory
      ↓
  updateImportPaths
      ↓
  optimizeImports
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL IDEA
 * ------------------------------------------------------------
 *
 * moveDirectory should ONLY:
 *
 * - move directory structure
 *
 * It should NOT:
 *
 * - rewrite imports
 * - update aliases
 * - rewrite routes
 * - optimize imports
 * - update references
 *
 * Those belong to separate primitives.
 *
 * ------------------------------------------------------------
 * EXAMPLE PIPELINE
 * ------------------------------------------------------------
 *
 * "move auth into modules"
 *
 * usually becomes:
 *
 * moveDirectory()
 *      ↓
 * updateImportPaths()
 *      ↓
 * optimizeImports()
 *
 * ------------------------------------------------------------
 * WHAT GETS MOVED?
 * ------------------------------------------------------------
 *
 * Entire directory tree:
 *
 * - files
 * - nested folders
 * - submodules
 * - assets
 *
 * Example:
 *
 * auth/
 *   hooks/
 *   pages/
 *   utils/
 *
 * entire structure gets relocated.
 *
 * ------------------------------------------------------------
 * SAFETY BEHAVIOR
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - checks source directory existence
 * - creates destination parent directories automatically
 *
 * WHY?
 *
 * Prevent runtime crashes.
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * - overwrites destination if already exists
 *
 * Future improvements:
 *
 * - collision prevention
 * - dependency graph updates
 * - alias auto-rewrite
 * - safe move mode
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.sourcePath
 * Existing directory path.
 *
 * Example:
 * "src/components/auth"
 *
 * @param {string} params.destinationPath
 * Destination directory path.
 *
 * Example:
 * "src/modules/auth"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   sourcePath: string,
 *   destinationPath: string
 * }}
 *
 */
function moveDirectory(
  { sourcePath, destinationPath }: TaskPayload<"moveDirectory">,
  appContext: AppContext
): TaskResponse<TaskReturn<"moveDirectory">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Check whether source directory exists
  //
  // WHY?
  //
  // Prevent moving non-existing directory.
  // ----------------------------------------------------------

  const directoryExists = fs.existsSync(sourcePath);

  // ----------------------------------------------------------
  // STEP 2:
  // If source directory does not exist:
  // return safely
  // ----------------------------------------------------------

  if (!directoryExists) {
    return {
      success: false,
      message: "Source directory does not exist",
      sourcePath,
      destinationPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve destination parent directory
  //
  // Example:
  //
  // src/modules/auth
  //
  // becomes:
  //
  // src/modules
  // ----------------------------------------------------------

  // const destinationParentDirectory = path.dirname(destinationPath);

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure destination parent directory exists
  //
  // recursive: true
  //
  // allows nested directory creation.
  // ----------------------------------------------------------

  // fs.mkdirSync(destinationParentDirectory, {
  //   recursive: true,
  // });

  // ----------------------------------------------------------
  // STEP 5:
  // Move directory
  //
  // Internally this uses rename operation.
  // ----------------------------------------------------------
  const directoryName = path.basename(sourcePath);

  const finalDestinationPath = path.join(destinationPath, directoryName);

  fs.renameSync(sourcePath, finalDestinationPath);

  // ----------------------------------------------------------
  // STEP 6:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Moved directory from ${sourcePath} to ${destinationPath}`,
    sourcePath,
    destinationPath,
  };
}

/**
 * DescriptionForPrompt: Creates a new component directory and its associated files.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function generates a complete React component file.
 *
 * It creates:
 *
 * - import statements
 * - function declaration component
 * - JSX return block
 * - export default statement
 * 
 * It does not create:
 * - actual component in the directory
 * 
 * Useful commands:
 * - make a header: createComponent(Header)
 * - add navbar: createComponent(Navbar)
 * - create footer: createComponent(Footer)
 * - add login form: createComponent(LoginForm)
 * - make sidebar: createComponent(Sidebar)
 *
 * createComponent
    ↓
createFile
    ↓
ensureImport
    ↓
insertJSX
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL CONSTRAINT
 * ------------------------------------------------------------
 *
 * This implementation ONLY creates:
 *
 * function declaration components
 *
 * Example:
 *
 * function Header() {}
 *
 * NOT:
 *
 * const Header = () => {}
 *
 * This keeps architecture deterministic and easy to analyze.
 *
 * ------------------------------------------------------------
 * ONE COMPONENT PER FILE
 * ------------------------------------------------------------
 *
 * This function assumes:
 *
 * - one component per file
 * - filename === component name
 *
 * Example:
 *
 * Header.jsx
 * -> contains only Header component
 *
 * ------------------------------------------------------------
 * WHY AST IS IMPORTANT
 * ------------------------------------------------------------
 *
 * JSX generation using string concatenation becomes fragile.
 *
 * Problems:
 * - invalid JSX nesting
 * - malformed syntax
 * - formatting inconsistency
 * - broken exports/imports
 *
 * AST guarantees:
 * - valid syntax
 * - deterministic structure
 * - safe JSX generation
 *
 * ------------------------------------------------------------
 * BODY FORMAT
 * ------------------------------------------------------------
 *
 * body should contain JSX ONLY.
 *
 * Example:
 *
 * <header>
 *   <h1>Hello</h1>
 * </header>
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentName
 * React component name.
 *
 * @param {string[]} params.props
 * Component props.
 *
 * Example:
 * ["title", "onClick"]
 *
 * @param {string} params.body
 * JSX body content.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
    success,
    componentName,
    componentDirectoryPath,
    jsxFilePath,
    cssFilePath,
    indexFilePath,
* }}
*
*/
function createComponent(
  {
    componentName,
    componentCode,
    parentDirectory,
  }: TaskPayload<"createComponent">,
  appContext: AppContext
): TaskResponse<TaskReturn<"createComponent">> {
  // : TaskPayload<"createComponent">): TaskReturn<"createComponent">
  // ----------------------------------------------------------
  // STEP 1:
  // Compute component directory and file paths.
  // ----------------------------------------------------------

  const componentDirectoryPath = path.join(parentDirectory, componentName);

  const jsxFilePath = path.join(
    componentDirectoryPath,
    `${componentName}${appContext.config.componentStructure[0]}`
  );

  const cssFilePath = path.join(
    componentDirectoryPath,
    `${componentName}${appContext.config.componentStructure[1]}`
  );

  const indexFilePath = path.join(
    componentDirectoryPath,
    appContext.config.componentStructure[2]
  );

  // ----------------------------------------------------------
  // STEP 2:
  // Create the component directory.
  // ----------------------------------------------------------

  const createDirectoryResult = createDirectory(
    {
      directoryPath: componentDirectoryPath,
    },
    appContext
  );

  if (!createDirectoryResult.success) {
    return {
      success: false,
      message: "Cannot create component directory",
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Prepare component code.
  //
  // If code is not provided, create a basic template.
  // ----------------------------------------------------------

  const cssClassname = componentName.toLowerCase();
  const code =
    componentCode ??
    `import "./${componentName}${appContext.config.componentStructure[1]}";

function ${componentName}() {
  return (
    <div className="${cssClassname}" data-farmon-id="cmp-${componentName.toLowerCase()}">
      ${componentName}
    </div>
  );
}

export default ${componentName};
`;

  const formatedCode = utils.formatCode(code);

  // ----------------------------------------------------------
  // STEP 4:
  // Create component file.
  // ----------------------------------------------------------

  const jsxResult = createFile(
    {
      filePath: jsxFilePath,
      content: formatedCode,
    },
    appContext
  );

  if (!jsxResult.success) {
    return jsxResult;
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Create css file.
  // ----------------------------------------------------------

  const cssResult = createFile(
    {
      filePath: cssFilePath,
      content: `.${cssClassname} {\n\n}`,
    },
    appContext
  );

  if (!cssResult.success) {
    return cssResult;
  }

  // ----------------------------------------------------------
  // STEP 6:
  // Create index file.
  // ----------------------------------------------------------

  const indexResult = createFile(
    {
      filePath: indexFilePath,
      content: `export { default } from "./${componentName}";\n`,
    },
    appContext
  );

  if (!indexResult.success) {
    return indexResult;
  }

  // ----------------------------------------------------------
  // STEP 7:
  // Return created paths.
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Created component ${componentName}`,
    componentName,
    componentDirectoryPath,
    jsxFilePath,
    cssFilePath,
    indexFilePath,
  };
}

/**
* Updates the JSX returned by an existing React component.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function replaces the returned JSX of a component
* while preserving:
*
* - component name
* - props
* - internal variables
* - hooks
* - helper functions
*
* It ONLY replaces:
*
* - returned JSX
*
* ------------------------------------------------------------
* EXAMPLE
* ------------------------------------------------------------
*
* BEFORE:
*
* function Header() {
*   return <div>Hello</div>;
* }
*
* AFTER:
*
* function Header() {
*   return (
*     <header>
*       <h1>Hello</h1>
*     </header>
*   );
* }
*
* Remember this does not update component in the file, 
* this only gives you updated component code which you can then insert back into the file.
* ------------------------------------------------------------
* WHY THIS APPROACH IS IMPORTANT
* ------------------------------------------------------------
*
* In UI editing systems:
*
* users usually want to modify UI structure,
* NOT destroy component logic.
*
* Example:
*
* "make header red"
*
* should update JSX/styles only,
* not recreate entire component.
*
* ------------------------------------------------------------
* WHY AST IS IMPORTANT
* ------------------------------------------------------------
*
* JSX replacement using string replacement is fragile.
*
* Problems:
* - nested JSX
* - multiline formatting
* - duplicate component names
* - syntax corruption
*
* AST guarantees:
* - valid JSX
* - deterministic updates
* - structure-aware replacement
*
* Useful commands:
* - make header red: updateComponent(Header)
* - add sign up button in navbar: updateComponent(Navbar)
* - change footer layout: updateComponent(Footer)
* - make sidebar collapsible: updateComponent(Sidebar)
* - add search input in header: updateComponent(Header)
* 
* updateComponent
   ↓
ensureImport
   ↓
optimizeImports
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL CONSTRAINT
* ------------------------------------------------------------
*
* This implementation supports ONLY:
*
* function declaration components
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
* JSX FORMAT
* ------------------------------------------------------------
*
* newJSX should contain valid JSX ONLY.
*
* Example:
*
* <header>
*   <h1>Hello</h1>
* </header>
*
* ------------------------------------------------------------
* OPTIONAL LINE TARGETING
* ------------------------------------------------------------
*
* Multiple components with same name may exist.
*
* line targeting enables deterministic selection.
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
* Component to update.
*
* @param {string} params.newJSX
* New JSX to return.
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{
*     success,
componentPath,
oldComponentCode,
newComponentCode,
* }}
* Updated source code.
*
*/
function updateComponent(
  { componentPath, componentCode }: TaskPayload<"updateComponent">,
  appContext: AppContext
): TaskResponse<TaskReturn<"updateComponent">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Verify that the component directory exists.
  // ----------------------------------------------------------

  const componentExists = fs.existsSync(componentPath);

  if (!componentExists) {
    return {
      success: false,
      message: "Component does not exist",
      componentPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 1:
  // Read existing component code
  // ----------------------------------------------------------

  const oldComponentCode = fs.readFileSync(componentPath, "utf8");

  // ----------------------------------------------------------
  // STEP 2:
  // Replace component with new code
  // ----------------------------------------------------------

  fs.writeFileSync(componentPath, componentCode, "utf8");

  // ----------------------------------------------------------
  // STEP 3:
  // Return snapshots for undo/redo
  // ----------------------------------------------------------

  return {
    success: true,

    message: `Updated component ${path.basename(componentPath)}`,

    componentPath,

    oldComponentCode,

    newComponentCode: componentCode,
  };
}

/**
* DescriptionForPrompt: Removes a component by moving its directory to trash.
*
* ------------------------------------------------------------
* WHAT THIS FUNCTION DOES
* ------------------------------------------------------------
*
* This function removes an entire React component.
*
* It removes:
*
* - component declaration
* - props
* - hooks
* - internal functions
* - returned JSX
*
* ------------------------------------------------------------
* EXAMPLE
* ------------------------------------------------------------
*
* BEFORE:
*
* function Header() {
*   return <header>Hello</header>;
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
* This function ONLY removes the component declaration.
*
* It does NOT:
*
* - remove component usages
* - remove imports
* - remove JSX references
* - delete component file
*
* Those should happen as separate cleanup steps.
*
* ------------------------------------------------------------
* WHY AST IS IMPORTANT
* ------------------------------------------------------------
*
* Component deletion using regex/string replacement is fragile.
*
* Problems:
* - nested JSX
* - multiline components
* - duplicate component names
* - nested functions/hooks
*
* AST guarantees:
* - syntax-safe removal
* - deterministic targeting
* - structure-aware deletion
*
* Useful commands:
* - remove header: deleteComponent(Header)
* - delete navbar: deleteComponent(Navbar)
* - remove login form: deleteComponent(LoginForm)
* - delete sidebar: deleteComponent(Sidebar)
* - remove footer section: deleteComponent(Footer)
* 
* deleteComponent
   ↓
removeImport
   ↓
remove JSX usage
   ↓
optimizeImports
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL CONSTRAINT
* ------------------------------------------------------------
*
* This implementation supports ONLY:
*
* function declaration components
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
* OPTIONAL LINE TARGETING
* ------------------------------------------------------------
*
* Multiple components with same name may exist.
*
* line targeting enables deterministic selection.
*
* ------------------------------------------------------------
* IMPORTANT ARCHITECTURAL IDEA
* ------------------------------------------------------------
*
* Component deletion is usually part of a larger pipeline:
*
* deleteComponent
*      ↓
* removeImport
*      ↓
* removeJSX
*      ↓
* optimizeImports
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
* Component to delete.
*
* @param {number=} params.line
* Optional component declaration line.
*
* ------------------------------------------------------------
* RETURNS
* ------------------------------------------------------------
*
* @returns {{ 
* success: boolean, 
* componentDirectoryPath: string, 
* trashPath: string
* }}
*
*/
function deleteComponent(
  { componentName, parentDirectory }: TaskPayload<"deleteComponent">,
  appContext?: AppContext
): TaskResponse<TaskReturn<"deleteComponent">> {
  // ----------------------------------------------------------
  // Derive the absolute component directory path from
  // componentName and parentDirectory.
  //
  // Example:
  //
  // componentName:
  // Header
  //
  // parentDirectory:
  // ../../src/components/App
  //
  // componentDirectoryPath:
  // ../../src/components/App/Header
  // ----------------------------------------------------------

  const componentDirectoryPath = path.join(parentDirectory, componentName);

  // ----------------------------------------------------------
  // STEP 1:
  // Verify that the component directory exists.
  // ----------------------------------------------------------

  const componentExists = fs.existsSync(componentDirectoryPath);

  if (!componentExists) {
    return {
      success: false,
      message: "Component directory does not exist",
      componentDirectoryPath,
      trashPath: null,
    };
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Delete the component by moving it to
  // .looma-trash.
  //
  // We delegate the actual deletion mechanism
  // to deleteDirectory.
  // ----------------------------------------------------------

  const result = deleteDirectory(
    {
      directoryPath: componentDirectoryPath,
    },
    appContext
  );

  if (!result.success) {
    return {
      success: false,
      message: "Failed to delete component directory",
      componentDirectoryPath: result.directoryPath,
      trashPath: result.trashPath,
    };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Return result.
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Deleted component ${path.basename(componentDirectoryPath)}`,
    componentDirectoryPath,
    trashPath: result.trashPath,
  };
}

/**
 * DescriptionForPrompt: Moves a component directory to a different location.
 * to another directory.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function relocates an entire component
 * folder safely.
 *
 * Example:
 *
 * BEFORE:
 *
 * src/components/Header
 *
 * AFTER:
 *
 * src/layout/Header
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma frequently needs to:
 *
 * - reorganize project structure
 * - extract feature modules
 * - group related components
 * - normalize architecture
 * - move shared components
 * - refactor large projects
 *
 * Instead of manually moving files,
 * this function safely handles:
 *
 * - component folder movement
 * - path validation
 * - collision prevention
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma treats a component as:
 *
 * a directory unit.
 *
 * Example:
 *
 * Header/
 *   Header.jsx
 *   Header.css
 *   index.js
 *
 * So moving a component means:
 *
 * moving the ENTIRE folder.
 *
 * NOT just one file.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * ONLY moves files/directories.
 *
 * It does NOT automatically update:
 *
 * - imports
 * - registry references
 * - route references
 * - test paths
 *
 * Those should be handled separately.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - createComponent()
 * - updateComponent()
 * - deleteComponent()
 * - moveFile()
 * - moveDirectory()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "move header to layout folder"
 * - "extract shared components"
 * - "move navbar into common"
 * - "reorganize project"
 * - "group dashboard components"
 * - "refactor component structure"
 *
 * Usually executed BEFORE:
 *
 * - import synchronization
 * - registry synchronization
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.sourcePath
 * Existing component folder path.
 *
 * Example:
 *
 * "./src/components/Header"
 *
 * @param {string} params.destinationPath
 * Target directory path.
 *
 * Example:
 *
 * "./src/layout"
 *
 * @param {boolean} [params.createDestination=true]
 * Whether destination directory should
 * be auto-created if missing.
 *
 * @param {boolean} [params.overwrite=false]
 * Whether existing component at destination
 * should be overwritten.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   oldPath: string,
 *   newPath: string
 * }}
 *
 *
 *
 */
function moveComponent(
  {
    sourcePath,
    destinationPath,
    createDestination = true,
    overwrite = false,
  }: TaskPayload<"moveComponent">,
  appContext: AppContext
): TaskResponse<TaskReturn<"moveComponent">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute source path
  // ----------------------------------------------------------

  const absoluteSourcePath = path.resolve(sourcePath);

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve absolute destination directory
  // ----------------------------------------------------------

  const absoluteDestinationPath = path.resolve(destinationPath);

  // ----------------------------------------------------------
  // STEP 3:
  // Validate source component existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteSourcePath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component does not exist: ${absoluteSourcePath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Validate source is directory
  // ----------------------------------------------------------

  const sourceStats = fs.statSync(absoluteSourcePath);

  if (!sourceStats.isDirectory()) {
    throw new LoomaError(
      ERROR_CODES.INVALID_PATH,
      `Component path is not a directory: ${absoluteSourcePath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Create destination directory if needed
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteDestinationPath)) {
    // --------------------------------------------------------
    // Skip creation if disabled
    // --------------------------------------------------------

    if (!createDestination) {
      throw new LoomaError(
        ERROR_CODES.DIRECTORY_NOT_FOUND,
        `Destination directory does not exist: ${absoluteDestinationPath}`
      );
    }

    // --------------------------------------------------------
    // Create destination directory recursively
    // --------------------------------------------------------

    fs.mkdirSync(absoluteDestinationPath, {
      recursive: true,
    });
  }

  // ----------------------------------------------------------
  // STEP 6:
  // Extract component folder name
  //
  // Example:
  //
  // Header
  // ----------------------------------------------------------

  const componentFolderName = path.basename(absoluteSourcePath);

  // ----------------------------------------------------------
  // STEP 7:
  // Build final destination component path
  // ----------------------------------------------------------

  const finalDestinationPath = path.join(
    absoluteDestinationPath,
    componentFolderName
  );

  // ----------------------------------------------------------
  // STEP 8:
  // Prevent accidental overwrite
  // ----------------------------------------------------------

  if (fs.existsSync(finalDestinationPath)) {
    // --------------------------------------------------------
    // Remove existing destination if overwrite enabled
    // --------------------------------------------------------

    if (overwrite) {
      fs.rmSync(finalDestinationPath, {
        recursive: true,
        force: true,
      });
    }

    // --------------------------------------------------------
    // Otherwise throw error
    // --------------------------------------------------------
    else {
      throw new LoomaError(
        ERROR_CODES.COMPONENT_ALREADY_EXISTS,
        `Component already exists at destination: ${finalDestinationPath}`
      );
    }
  }

  // ----------------------------------------------------------
  // STEP 9:
  // Move component directory
  // ----------------------------------------------------------

  fs.renameSync(absoluteSourcePath, finalDestinationPath);

  // ----------------------------------------------------------
  // STEP 10:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Moved component from ${absoluteSourcePath} to ${finalDestinationPath}`,
    oldPath: absoluteSourcePath,
    newPath: finalDestinationPath,
  };
}

/**
 * DescriptionForPrompt: Renames a component and optionally updates its code references.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function renames:
 *
 * - component directory
 * - component jsx file
 * - component css file
 *
 * and optionally updates:
 *
 * - component name inside code
 * - export statements
 *
 * Example:
 *
 * BEFORE:
 *
 * Header/
 *   Header.jsx
 *   Header.css
 *
 * AFTER:
 *
 * Navbar/
 *   Navbar.jsx
 *   Navbar.css
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma frequently needs to:
 *
 * - normalize naming
 * - improve architecture
 * - refactor components
 * - extract reusable UI
 * - rename generated components
 * - align naming conventions
 *
 * Manual renaming is dangerous because:
 *
 * - filenames can mismatch
 * - component names can mismatch
 * - css filenames can mismatch
 *
 * This function keeps them synchronized.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma treats a component as:
 *
 * a directory-based unit.
 *
 * Example:
 *
 * Header/
 *   Header.jsx
 *   Header.css
 *   index.js
 *
 * Renaming a component means:
 *
 * renaming the ENTIRE component ecosystem.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation updates:
 *
 * - folder names
 * - jsx filenames
 * - css filenames
 * - component declaration names
 *
 * It does NOT automatically update:
 *
 * - imports in other files
 * - route references
 * - registry references
 * - tests
 *
 * Those should be handled separately.
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function complements:
 *
 * - createComponent()
 * - updateComponent()
 * - deleteComponent()
 * - moveComponent()
 * - renameFile()
 * - renameDirectory()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "rename header to navbar"
 * - "rename card component"
 * - "normalize naming"
 * - "extract reusable component"
 * - "cleanup architecture"
 * - "rename generated component"
 *
 * Usually executed BEFORE:
 *
 * - import synchronization
 * - registry synchronization
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.componentPath
 * Existing component directory path.
 *
 * Example:
 *
 * "./src/components/Header"
 *
 * @param {string} params.newComponentName
 * New component name.
 *
 * Example:
 *
 * "Navbar"
 *
 * @param {boolean} [params.updateComponentCode=true]
 * Whether component declarations
 * inside JSX should also be renamed.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   oldComponentName: string,
 *   newComponentName: string,
 *   newComponentPath: string
 * }}
 *
 */
function renameComponent(
  {
    componentPath,
    newComponentName,
    updateComponentCode = true,
  }: TaskPayload<"renameComponent">,
  appContext: AppContext
): TaskResponse<TaskReturn<"renameComponent">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute component path
  // ----------------------------------------------------------

  const absoluteComponentPath = path.resolve(componentPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Validate component existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteComponentPath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component does not exist: ${absoluteComponentPath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Extract old component name
  //
  // Example:
  //
  // Header
  // ----------------------------------------------------------

  const oldComponentName = path.basename(absoluteComponentPath);

  // ----------------------------------------------------------
  // STEP 4:
  // Build old file paths
  // ----------------------------------------------------------

  const oldJsxPath = path.join(
    absoluteComponentPath,
    `${oldComponentName}${appContext.config.componentStructure[0]}`
  );

  const oldCssPath = path.join(
    absoluteComponentPath,
    `${oldComponentName}${appContext.config.componentStructure[1]}`
  );

  // ----------------------------------------------------------
  // STEP 5:
  // Build new directory path
  // ----------------------------------------------------------

  const parentDirectory = path.dirname(absoluteComponentPath);

  const newComponentPath = path.join(parentDirectory, newComponentName);

  // ----------------------------------------------------------
  // STEP 6:
  // Prevent destination conflicts
  // ----------------------------------------------------------

  if (fs.existsSync(newComponentPath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_ALREADY_EXISTS,
      `Component already exists: ${newComponentPath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 7:
  // Rename component directory
  // ----------------------------------------------------------

  fs.renameSync(absoluteComponentPath, newComponentPath);

  // ----------------------------------------------------------
  // STEP 8:
  // Build new file paths
  // ----------------------------------------------------------

  const newJsxPath = path.join(
    newComponentPath,
    `${newComponentName}${appContext.config.componentStructure[0]}`
  );

  const newCssPath = path.join(
    newComponentPath,
    `${newComponentName}${appContext.config.componentStructure[1]}`
  );

  // ----------------------------------------------------------
  // STEP 9:
  // Rename JSX file if exists
  // ----------------------------------------------------------

  const movedOldJsxPath = path.join(
    newComponentPath,
    `${oldComponentName}${appContext.config.componentStructure[0]}`
  );

  if (fs.existsSync(movedOldJsxPath)) {
    fs.renameSync(movedOldJsxPath, newJsxPath);
  }

  // ----------------------------------------------------------
  // STEP 10:
  // Rename CSS file if exists
  // ----------------------------------------------------------

  const movedOldCssPath = path.join(
    newComponentPath,
    `${oldComponentName}${appContext.config.componentStructure[1]}`
  );

  if (fs.existsSync(movedOldCssPath)) {
    fs.renameSync(movedOldCssPath, newCssPath);
  }

  // ----------------------------------------------------------
  // STEP 11:
  // Update component declaration names
  //
  // Example:
  //
  // function Header()
  // →
  // function Navbar()
  // ----------------------------------------------------------

  if (updateComponentCode && fs.existsSync(newJsxPath)) {
    // --------------------------------------------------------
    // Read component source
    // --------------------------------------------------------

    let componentCode = fs.readFileSync(newJsxPath, "utf8");

    // --------------------------------------------------------
    // Replace component declaration names
    // --------------------------------------------------------

    const componentNameRegex = new RegExp(`\\b${oldComponentName}\\b`, "g");

    componentCode = componentCode.replace(componentNameRegex, newComponentName);

    // --------------------------------------------------------
    // Write updated component source
    // --------------------------------------------------------

    fs.writeFileSync(newJsxPath, componentCode, "utf8");
  }

  // ----------------------------------------------------------
  // STEP 12:
  // Return operation result
  // ----------------------------------------------------------

  return {
    success: true,

    message: `Renamed component ${oldComponentName} to ${newComponentName}`,

    oldComponentName,

    newComponentName,

    newComponentPath,
  };
}

/**
 * DescriptionForPrompt: Extracts JSX into a new standalone component.
 * into a brand new reusable component.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * This function:
 *
 * 1. Creates a new component
 * 2. Moves selected JSX into that component
 * 3. Replaces original JSX with new component usage
 * 4. Adds import statement automatically
 *
 * Example:
 *
 * BEFORE:
 *
 * Home.jsx
 *
 * function Home() {
 *   return (
 *     <div>
 *       <div className="hero">
 *         <h1>Welcome</h1>
 *       </div>
 *     </div>
 *   );
 * }
 *
 * AFTER:
 *
 * Home.jsx
 *
 * import HeroSection from "./HeroSection/HeroSection";
 *
 * function Home() {
 *   return (
 *     <div>
 *       <HeroSection />
 *     </div>
 *   );
 * }
 *
 * New file:
 *
 * HeroSection/HeroSection.jsx
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Large components eventually become:
 *
 * - hard to maintain
 * - difficult to reason about
 * - impossible for AI to edit reliably
 * - architecture nightmares
 *
 * Looma should aggressively:
 *
 * split large UI into smaller components.
 *
 * This function is one of the MOST IMPORTANT
 * architecture primitives in the system.
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURAL DECISION
 * ------------------------------------------------------------
 *
 * Looma should NEVER allow:
 *
 * gigantic components.
 *
 * AI editing quality collapses
 * when component size grows too much.
 *
 * Therefore:
 *
 * automatic extraction is essential.
 *
 * ------------------------------------------------------------
 * IMPORTANT NOTE
 * ------------------------------------------------------------
 *
 * Current implementation:
 *
 * uses string replacement.
 *
 * Production version should use:
 *
 * AST-level JSX extraction.
 *
 * because string replacement becomes fragile
 * with:
 *
 * - nested JSX
 * - conditional rendering
 * - fragments
 * - expressions
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
 * - insertJSX()
 * - replaceJSX()
 * - includeImport()
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "extract hero section"
 * - "split navbar component"
 * - "make reusable card"
 * - "separate footer"
 * - "cleanup huge component"
 * - "modularize layout"
 * - "extract repeated jsx"
 *
 * Usually executed AFTER:
 *
 * - JSX analysis
 * - DOM selection
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.parentComponentPath
 * Parent component JSX file path.
 *
 * Example:
 *
 * "./src/components/Home/Home.jsx"
 *
 * @param {string} params.newComponentName
 * New component name.
 *
 * Example:
 *
 * "HeroSection"
 *
 * @param {string} params.targetJSX
 * JSX string to extract.
 *
 * Example:
 *
 * `<div className="hero">...</div>`
 *
 * @param {string} params.componentsDirectory
 * Base components directory.
 *
 * Example:
 *
 * "./src/components"
 *
 * @param {boolean} [params.includeCss=true]
 * Whether css file should be created.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   componentPath: string,
 *   updatedParentPath: string
 * }}
 *
 *
 *
 */
function extractComponent(
  {
    parentComponentPath,
    newComponentName,
    targetJSX,
    componentsDirectory,
    includeCss = true,
  }: TaskPayload<"extractComponent">,
  appContext: AppContext
): TaskResponse<TaskReturn<"extractComponent">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve absolute parent component path
  // ----------------------------------------------------------

  const absoluteParentPath = path.resolve(parentComponentPath);

  // ----------------------------------------------------------
  // STEP 2:
  // Validate parent component existence
  // ----------------------------------------------------------

  if (!fs.existsSync(absoluteParentPath)) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Parent component does not exist: ${absoluteParentPath}`
    );
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read parent component source code
  // ----------------------------------------------------------

  let parentCode = fs.readFileSync(absoluteParentPath, "utf8");

  // ----------------------------------------------------------
  // STEP 4:
  // Create new component directory
  // ----------------------------------------------------------

  const componentDirectoryPath = path.join(
    path.resolve(componentsDirectory),
    newComponentName
  );

  fs.mkdirSync(componentDirectoryPath, {
    recursive: true,
  });

  const componentIndexPath = path.join(
    componentDirectoryPath,
    appContext.config.componentStructure[2]
  );
  // ----------------------------------------------------------
  // STEP 5:
  // Build new component JSX path
  // ----------------------------------------------------------

  const componentJsxPath = path.join(
    componentDirectoryPath,
    `${newComponentName}${appContext.config.componentStructure[0]}`
  );

  // ----------------------------------------------------------
  // STEP 6:
  // Build component CSS path
  // ----------------------------------------------------------

  const componentCssPath = path.join(
    componentDirectoryPath,
    `${newComponentName}${appContext.config.componentStructure[1]}`
  );

  // ----------------------------------------------------------
  // STEP 7:
  // Create component source code
  // ----------------------------------------------------------

  const componentCode = `
import "./${newComponentName}${appContext.config.componentStructure[1]}";

function ${newComponentName}() {
  return (
    <>
      ${targetJSX}
    </>
  );
}

export default ${newComponentName};
`;

  const componentIndexCode = `export { default } from "./${newComponentName}";\n`;

  // ----------------------------------------------------------
  // STEP 8:
  // Write index.ts file and new component JSX file
  // ----------------------------------------------------------

  fs.writeFileSync(componentIndexPath, componentIndexCode.trim(), "utf8");

  fs.writeFileSync(componentJsxPath, componentCode.trim(), "utf8");

  // ----------------------------------------------------------
  // STEP 9:
  // Create CSS file if enabled
  // ----------------------------------------------------------

  if (includeCss) {
    fs.writeFileSync(componentCssPath, "", "utf8");
  }

  // ----------------------------------------------------------
  // STEP 10:
  // Replace extracted JSX
  // with new component usage
  // ----------------------------------------------------------

  parentCode = parentCode.replace(targetJSX, `<${newComponentName} />`);

  // ----------------------------------------------------------
  // STEP 11:
  // Add component import statement
  //
  // IMPORTANT:
  // Simplified implementation.
  //
  // Production version should use AST.
  // ----------------------------------------------------------

  const importStatement = `import ${newComponentName} from "./${newComponentName}";\n`;

  parentCode = importStatement + parentCode;

  // ----------------------------------------------------------
  // STEP 12:
  // Write updated parent component
  // ----------------------------------------------------------

  fs.writeFileSync(absoluteParentPath, parentCode, "utf8");

  // ----------------------------------------------------------
  // STEP 13:
  // Return extraction summary
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Extracting component`,
    componentPath: componentDirectoryPath,
    componentDirectoryPath,
    updatedParentPath: absoluteParentPath,
  };
}

/**
 * DescriptionForPrompt: Creates or updates CSS declarations for a selector.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * Plain string replacement is unsafe for CSS mutations.
 *
 * Example problem:
 *
 * Searching for:
 *   "header"
 *
 * could accidentally modify:
 *   .main-header
 *   .header-nav
 *   url('/header.png')
 *
 * Instead, this function:
 *
 * - parses CSS into AST
 * - finds exact selector
 * - updates only target rule
 * - preserves formatting structure
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma frequently needs to:
 *
 * - change colors
 * - modify spacing
 * - update layouts
 * - tweak responsive rules
 * - modify animations
 * - change typography
 *
 * Instead of replacing entire css file,
 * this function updates only targeted styles.
 *
 * ------------------------------------------------------------
 * IMPORTANT DESIGN DECISION
 * ------------------------------------------------------------
 *
 * This function:
 *
 * ONLY updates existing styles.
 *
 * It does NOT:
 *
 * - insert entirely new styles
 * - remove styles
 * - optimize css
 * - merge selectors
 *
 * Those are handled by:
 *
 * - insertStyles()
 * - removeStyles()
 * - optimizeStyles()
 *
 * ------------------------------------------------------------
 * DEPENDENCIES
 * ------------------------------------------------------------
 *
 * This function assumes:
 *
 * - ensureStyleFile()
 * - insertStyles()
 *
 * are already available.
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "make header red"
 * - "increase button padding"
 * - "change font size"
 * - "make navbar sticky"
 * - "change card width"
 * - "update hover effect"
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
 * @param {string} params.selector
 * Exact CSS selector to update.
 *
 * Example:
 *
 * .main-header
 *
 * @param {Object} params.styles
 * CSS declarations to update.
 *
 * Example:
 *
 * {
 *   color: "blue",
 *   padding: "12px"
 * }
 *
 * @param {boolean} params.createIfMissing
 * Create selector if missing.
 *

 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 * success: boolean,
 *   updated: boolean,
  *   cssPath: string
  * selectorFound: string , 
  * cssCode: string, 
  * updatedCss: string
  * }}
  * 
 */
function updateStyles(
  {
    cssPath,
    selector,
    styles = {},
    createIfMissing = true,
  }: TaskPayload<"updateStyles">,
  appContext: AppContext
): TaskResponse<TaskReturn<"updateStyles">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Read existing CSS file
  // ----------------------------------------------------------

  const cssCode = fs.readFileSync(cssPath, "utf8");

  // ----------------------------------------------------------
  // STEP 2:
  // Parse CSS into AST
  // ----------------------------------------------------------

  const root = postcss.parse(cssCode);

  // ----------------------------------------------------------
  // Track whether selector exists
  // ----------------------------------------------------------

  let selectorFound = false;

  // ----------------------------------------------------------
  // STEP 3:
  // Walk through CSS rules
  // ----------------------------------------------------------

  root.walkRules((rule) => {
    // --------------------------------------------------------
    // Skip unrelated selectors
    // --------------------------------------------------------

    if (rule.selector !== selector) {
      return;
    }

    // --------------------------------------------------------
    // Mark selector as found
    // --------------------------------------------------------

    selectorFound = true;

    // --------------------------------------------------------
    // STEP 4:
    // Update declarations
    // --------------------------------------------------------

    for (const [property, value] of Object.entries(styles)) {
      // ------------------------------------------------------
      // Try finding existing declaration
      // ------------------------------------------------------

      const caseConvertedProperty = camelToKebab(property);

      const existingDeclaration = rule.nodes.find(
        (node) => node.type === "decl" && node.prop === caseConvertedProperty
      );

      // ------------------------------------------------------
      // Update existing property
      // ------------------------------------------------------
      if (existingDeclaration) {
        (existingDeclaration as postcss.Declaration).value = value;
      }

      // ------------------------------------------------------
      // Otherwise append new declaration
      // ------------------------------------------------------
      else {
        rule.append({
          prop: caseConvertedProperty,
          value,
        });
      }
    }
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Create selector if missing
  // ----------------------------------------------------------

  if (!selectorFound && createIfMissing) {
    // --------------------------------------------------------
    // Create new rule node
    // --------------------------------------------------------

    const newRule = postcss.rule({
      selector,
    });

    // --------------------------------------------------------
    // Append declarations
    // --------------------------------------------------------

    for (const [property, value] of Object.entries(styles)) {
      const caseConvertedProperty = camelToKebab(property);
      newRule.append({
        prop: caseConvertedProperty,
        value,
      });
    }

    // --------------------------------------------------------
    // Append new rule into stylesheet
    // --------------------------------------------------------

    root.append(newRule);

    selectorFound = true;
  }

  // ----------------------------------------------------------
  // STEP 6:
  // Generate updated CSS
  // ----------------------------------------------------------

  const updatedCss = root.toString();

  // ----------------------------------------------------------
  // STEP 7:
  // Persist updated CSS
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, updatedCss, "utf8");

  // ----------------------------------------------------------
  // STEP 8:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Updated style ${formatStylesInline(styles)}`,
    cssCode,
    updatedCss,
  };
}

function formatStylesInline(styles: Record<string, string>) {
  return Object.entries(styles)
    .map(([property, value]) => `${property}: ${value}`)
    .join(", ");
}

/**
 * Converts a camelCase string to kebab-case.
 * * @param {string} str - The camelCase string to convert.
 * @returns {string} The converted kebab-case string.
 */
function camelToKebab(str) {
  if (!str || typeof str !== "string") return "";

  return (
    str
      // Insert a hyphen between a lowercase letter (or digit) and an uppercase letter
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      // Convert the entire string to lowercase
      .toLowerCase()
  );
}

/**
 * DescriptionForPrompt: Removes CSS selectors or style declarations.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Plain text removal is dangerous for CSS manipulation.
 *
 * Example problem:
 *
 * Removing:
 *   "header"
 *
 * could accidentally modify:
 *   .main-header
 *   .header-nav
 *   background-image: url('/header.png')
 *
 * CSS must be manipulated structurally,
 * not through string replacement.
 *
 * This function:
 *
 * - parses CSS into AST
 * - finds exact selector/declaration
 * - removes only intended nodes
 * - preserves stylesheet structure
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION CAN REMOVE
 * ------------------------------------------------------------
 *
 * 1. Entire selector
 *
 * Example:
 *
 * .main-header { ... }
 *
 * 2. Specific declaration
 *
 * Example:
 *
 * color: red;
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.cssPath
 * CSS file path.
 *
 * @param {Object} params.target
 * Removal target configuration.
 *
 * REMOVE ENTIRE SELECTOR:
 *
 * {
 *   selector: ".main-header"
 * }
 *
 * REMOVE SPECIFIC PROPERTY:
 *
 * {
 *   selector: ".main-header",
 *   property: "color"
 * }
 *
 * @param {boolean} params.removeAll
 * Whether to remove all matching selectors.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   success: boolean,
 *   removed: boolean,
 *   removedCount: number,
 *   cssCode: string
 * }}
 *
 *
 */
function removeStyles(
  { cssPath, target, removeAll = false }: TaskPayload<"removeStyles">,
  appContext: AppContext
): TaskResponse<TaskReturn<"removeStyles">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Read CSS file
  // ----------------------------------------------------------

  const cssCode = fs.readFileSync(cssPath, "utf8");

  // ----------------------------------------------------------
  // STEP 2:
  // Parse CSS into AST
  // ----------------------------------------------------------

  const root = postcss.parse(cssCode);

  // ----------------------------------------------------------
  // Track removed nodes count
  // ----------------------------------------------------------

  let removedCount = 0;

  // ----------------------------------------------------------
  // Extract target configuration
  // ----------------------------------------------------------

  const { selector, property } = target;

  // ----------------------------------------------------------
  // STEP 3:
  // Walk through CSS rules
  // ----------------------------------------------------------

  root.walkRules((rule) => {
    // --------------------------------------------------------
    // Skip unrelated selectors
    // --------------------------------------------------------

    if (rule.selector !== selector) {
      return;
    }

    // --------------------------------------------------------
    // CASE 1:
    // Remove entire selector block
    // --------------------------------------------------------

    if (!property) {
      // ------------------------------------------------------
      // Remove rule from AST
      // ------------------------------------------------------

      rule.remove();

      // ------------------------------------------------------
      // Increment removal count
      // ------------------------------------------------------

      removedCount++;

      // ------------------------------------------------------
      // Stop after first removal if removeAll is false
      // ------------------------------------------------------

      if (!removeAll) {
        return false;
      }

      return;
    }

    // --------------------------------------------------------
    // CASE 2:
    // Remove specific declaration property
    // --------------------------------------------------------

    rule.walkDecls((decl) => {
      // ------------------------------------------------------
      // Skip unrelated properties
      // ------------------------------------------------------

      if (decl.prop !== property) {
        return;
      }

      // ------------------------------------------------------
      // Remove declaration node
      // ------------------------------------------------------

      decl.remove();

      // ------------------------------------------------------
      // Increment removal count
      // ------------------------------------------------------

      removedCount++;

      // ------------------------------------------------------
      // Stop after first removal if removeAll is false
      // ------------------------------------------------------

      if (!removeAll) {
        return false;
      }
    });

    // --------------------------------------------------------
    // Remove empty rule blocks
    // --------------------------------------------------------

    const hasDeclarations =
      rule.nodes && rule.nodes.some((node) => node.type === "decl");

    if (!hasDeclarations) {
      rule.remove();
    }
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated CSS
  // ----------------------------------------------------------

  const updatedCss = root.toString();

  // ----------------------------------------------------------
  // STEP 5:
  // Persist updated CSS
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, updatedCss, "utf8");

  // ----------------------------------------------------------
  // STEP 6:
  // Return result
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Removed styles`,
    removed: removedCount > 0,
    removedCount,
    cssCode,
    updatedCss,
  };
}

/**
 * DescriptionForPrompt: Renames a CSS class in both CSS and JSX.
 *
 * - CSS file
 * - JSX/Component file
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * Blind string replacement is extremely dangerous.
 *
 * Example:
 *
 * Replacing:
 *   "header"
 *
 * could accidentally modify:
 *
 * - .main-header
 * - data-header
 * - url('/header.png')
 * - variable names
 * - comments
 * - text content
 *
 * CSS class mutations must be semantic.
 *
 * This function safely:
 *
 * - parses CSS into AST
 * - updates exact class selectors
 * - parses JSX into AST
 * - updates only className attributes
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Looma frequently needs to:
 *
 * - normalize naming
 * - extract components
 * - avoid naming collisions
 * - apply architecture conventions
 * - improve readability
 * - reorganize component structure
 *
 * Renaming ONLY in css file is dangerous
 * because JSX references would break.
 *
 * This function keeps both:
 *
 * - CSS
 * - JSX
 *
 * synchronized.
 *
 * ------------------------------------------------------------
 * IMPORTANT DESIGN DECISION
 * ------------------------------------------------------------
 *
 * This function:
 *
 * ONLY renames class names.
 *
 * It does NOT:
 *
 * - move styles
 * - merge styles
 * - optimize css
 * - remove unused styles
 *
 * Those are separate concerns.
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
 *
 * already exist.
 *
 * ------------------------------------------------------------
 * WHERE THIS FUNCTION IS USEFUL
 * ------------------------------------------------------------
 *
 * Useful in commands like:
 *
 * - "rename header class"
 * - "convert to BEM naming"
 * - "extract card component"
 * - "cleanup css naming"
 * - "normalize class structure"
 * - "rename navbar styles"
 *
 * ------------------------------------------------------------
 * IMPORTANT LIMITATION
 * ------------------------------------------------------------
 *
 * Current implementation handles:
 *
 * - className="..."
 * - class="..."
 *
 * string-based class usage only.
 *
 * It does NOT fully support:
 *
 * - clsx()
 * - classnames()
 * - template literals
 * - dynamic expressions
 *
 * Those require AST-level JSX analysis.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.cssPath
 * CSS file path.
 *
 * @param {string} params.componentPath
 * JSX component file path.
 *
 * @param {string} params.oldClassName
 * Existing class name.
 *
 * Example:
 *
 * "header-title"
 *
 * @param {string} params.newClassName
 * New class name.
 *
 * Example:
 *
 * "main-title"
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * @returns {{
 *   renamed: boolean,
 *   cssUpdated: boolean,
 * jsxUpdated: boolean,
 * cssCode: string,
 * updatedCssCode: string,
 * jsxCode: string,
 * updatedJsxCode: string
 * }}
 *
 */
function renameCssClass(
  {
    cssPath,
    componentJSXPath,
    oldClassName,
    newClassName,
  }: TaskPayload<"renameCssClass">,
  appContext: AppContext
): TaskResponse<TaskReturn<"renameCssClass">> {
  // ----------------------------------------------------------
  // Track mutation results
  // ----------------------------------------------------------

  let cssUpdated = false;
  let jsxUpdated = false;

  // ==========================================================
  // CSS RENAMING
  // ==========================================================

  // ----------------------------------------------------------
  // STEP 1:
  // Read CSS file
  // ----------------------------------------------------------

  const cssCode = fs.readFileSync(cssPath, "utf8");

  // ----------------------------------------------------------
  // STEP 2:
  // Parse CSS into AST
  // ----------------------------------------------------------

  const cssRoot = postcss.parse(cssCode);

  // ----------------------------------------------------------
  // STEP 3:
  // Walk through CSS rules
  // ----------------------------------------------------------

  cssRoot.walkRules((rule) => {
    // --------------------------------------------------------
    // Split grouped selectors safely
    // --------------------------------------------------------

    const selectors = rule.selectors;

    // --------------------------------------------------------
    // Track selector changes
    // --------------------------------------------------------

    let selectorChanged = false;

    // --------------------------------------------------------
    // Update exact class selectors
    // --------------------------------------------------------

    const updatedSelectors = selectors.map((selector) => {
      // ----------------------------------------------------
      // Replace exact class only
      // ----------------------------------------------------

      const updatedSelector = selector.replace(
        new RegExp(`\\.${oldClassName}(?![a-zA-Z0-9_-])`, "g"),
        `.${newClassName}`
      );

      // ----------------------------------------------------
      // Detect changes
      // ----------------------------------------------------

      if (updatedSelector !== selector) {
        selectorChanged = true;
      }

      return updatedSelector;
    });

    // --------------------------------------------------------
    // Persist selector updates
    // --------------------------------------------------------

    if (selectorChanged) {
      rule.selectors = updatedSelectors;

      cssUpdated = true;
    }
  });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated CSS
  // ----------------------------------------------------------

  const updatedCssCode = cssRoot.toString();

  // ----------------------------------------------------------
  // STEP 5:
  // Persist CSS changes
  // ----------------------------------------------------------

  fs.writeFileSync(cssPath, updatedCssCode, "utf8");

  // ==========================================================
  // JSX CLASSNAME RENAMING
  // ==========================================================

  // ----------------------------------------------------------
  // STEP 6:
  // Read JSX component file
  // ----------------------------------------------------------

  const jsxCode = fs.readFileSync(componentJSXPath, "utf8");

  // ----------------------------------------------------------
  // STEP 7:
  // Parse JSX into AST
  // ----------------------------------------------------------

  const jsxAST = parse(jsxCode, {
    sourceType: "module",
    plugins: ["jsx"],
  });

  // ----------------------------------------------------------
  // STEP 8:
  // Traverse JSX AST
  // ----------------------------------------------------------

  traverse.default(jsxAST, {
    JSXAttribute(path) {
      // ------------------------------------------------------
      // Skip unrelated attributes
      // ------------------------------------------------------

      if (path.node.name.name !== "className") {
        return;
      }

      // ------------------------------------------------------
      // Get attribute value node
      // ------------------------------------------------------

      const valueNode = path.node.value;

      // ------------------------------------------------------
      // Handle:
      //
      // className="..."
      // ------------------------------------------------------

      if (valueNode && valueNode.type === "StringLiteral") {
        // ----------------------------------------------------
        // Split class names
        // ----------------------------------------------------

        const classNames = valueNode.value.split(/\s+/);

        // ----------------------------------------------------
        // Replace exact class match only
        // ----------------------------------------------------

        const updatedClassNames = classNames.map((className) => {
          if (className === oldClassName) {
            jsxUpdated = true;

            return newClassName;
          }

          return className;
        });

        // ----------------------------------------------------
        // Rebuild className string
        // ----------------------------------------------------

        valueNode.value = updatedClassNames.join(" ");
      }
    },
  });

  // ----------------------------------------------------------
  // STEP 9:
  // Generate updated JSX
  // ----------------------------------------------------------

  const updatedJsxCode = generate(jsxAST, {}, jsxCode).code;

  // ----------------------------------------------------------
  // STEP 10:
  // Persist JSX changes
  // ----------------------------------------------------------

  fs.writeFileSync(componentJSXPath, updatedJsxCode, "utf8");

  // ----------------------------------------------------------
  // STEP 11:
  // Return mutation result
  // ----------------------------------------------------------

  return {
    success: true,

    message: `Renamed css classes`,

    renamed: cssUpdated || jsxUpdated,

    cssUpdated,

    jsxUpdated,

    cssCode,
    updatedCssCode,

    jsxCode,
    updatedJsxCode,
  };
}

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

// import fs from "fs";
// import path from "path";
// // import * as parser from "@babel/parser";
// import traverse from "@babel/traverse";
// import { parse, parseExpression } from "@babel/parser";
// import { generate } from "@babel/generator";
// import t from "@babel/types";
// import postcss from "postcss";

// import utils from "../../execute/helpers/general.js";
// import {
//   type TaskPayload,
//   type TaskReturn,
//   type TaskResponse,
//   ERROR_CODES,
//   ExecutionContext,
// } from "../../schemas/index.js";
// import { LoomaError } from "../../server/error.js";

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
  {
    filePath,
    variableName,
    value,
    scope,
    functionName,
  }: TaskPayload<"insertVariable">,
  appContext: AppContext
): TaskResponse<TaskReturn<"insertVariable">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "Added variable successfully",

    filePath,
  };
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
  { filePath, variableName, newValue }: TaskPayload<"updateVariable">,
  appContext: AppContext
): TaskResponse<TaskReturn<"updateVariable">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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

      // if (line && path.node.loc?.start.line !== line) {
      //   return;
      // }

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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "Updated variable successfully",

    filePath,
  };
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
  { filePath, variableName }: TaskPayload<"deleteVariable">,
  appContext: AppContext
): TaskResponse<TaskReturn<"deleteVariable">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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

          // if (line && declarator.loc?.start.line !== line) {
          //   return true;
          // }

          // ------------------------------------------------
          // Returning false removes declarator
          // ------------------------------------------------

          return false;
        }
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 3:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "Removed variable successfully",

    filePath,
  };
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
    t.blockStatement(parsedBody.program.body)
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
  {
    filePath,
    componentName,
    targetElement,
    jsx,
    position,
  }: TaskPayload<"insertJSX">,
  appContext: AppContext
): TaskResponse<TaskReturn<"insertJSX">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");

  // ----------------------------------------------------------
  // STEP 2:
  // Parse source code into AST
  // ----------------------------------------------------------

  const ast = parse(code, {
    sourceType: "module",
    plugins: ["jsx", "typescript"],
  });

  // ----------------------------------------------------------
  // STEP 3:
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
              t.jsxText("\n")
            );
          } else {
            jsxPath.node.children.push(
              t.jsxText("\n"),
              t.jsxExpressionContainer(jsxNode)
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;
  console.log("Updated code after JSX insertion:", updatedCode);
  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 7:
  // Generate updated source code from AST
  // ----------------------------------------------------------
  // const updatedCode = utils.formatCode(generate(ast).code);
  return {
    success: true,
    message: "JSX element added successfully",
    filePath,
    updatedCode,
  };
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
  { filePath, componentName, targetElement, newJSX }: TaskPayload<"replaceJSX">,
  appContext: AppContext
): TaskResponse<TaskReturn<"replaceJSX">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  return {
    success: true,
    message: "JSX element replaced successfully",

    filePath,
  };
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
  { filePath, componentName, targetElement }: TaskPayload<"removeJSX">,
  appContext: AppContext
): TaskResponse<TaskReturn<"removeJSX">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 4:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "JSX element removed successfully",

    filePath,
  };
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
  {
    filePath,
    componentName,
    targetElement,
    wrapperJSX,
  }: TaskPayload<"wrapJSX">,
  appContext: AppContext
): TaskResponse<TaskReturn<"wrapJSX">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
      "wrapperJSX must be a valid JSX element"
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 6:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "JSX element wrapped successfully",

    filePath,
  };
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
  {
    filePath,
    componentName,
    sourceElement,
    destinationElement,
  }: TaskPayload<"moveJSX">,
  appContext: AppContext
): TaskResponse<TaskReturn<"moveJSX">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "JSX element wrapped successfully",

    filePath,
  };
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
  { filePath, source, importName, importType }: TaskPayload<"removeImport">,
  appContext: AppContext
): TaskResponse<TaskReturn<"removeImport">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
          (specifier) => !t.isImportDefaultSpecifier(specifier)
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
          (specifier) => !t.isImportNamespaceSpecifier(specifier)
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
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "Import removed successfully",

    filePath,
  };
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
  {
    filePath,
    source,
    importName,
    importType,
    alias,
  }: TaskPayload<"ensureImport">,
  appContext: AppContext
): TaskResponse<TaskReturn<"ensureImport">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
            t.isImportDefaultSpecifier(s)
          );

          if (!hasDefault) {
            specifiers.unshift(
              t.importDefaultSpecifier(t.identifier(alias || importName))
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
            t.isImportNamespaceSpecifier(s)
          );

          if (hasNamespace) return;

          const hasNamed = specifiers.some(
            (s) =>
              t.isImportSpecifier(s) &&
              t.isIdentifier(s.imported) &&
              s.imported.name === importName
          );

          if (!hasNamed) {
            specifiers.push(
              t.importSpecifier(
                t.identifier(alias || importName),
                t.identifier(importName)
              )
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
            t.isImportNamespaceSpecifier(s)
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

    if (!modified)
      return { success: true, message: "Import already exists", filePath };

    return { success: true, filePath, message: "Import enriched successfully" };
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
      t.identifier(importName)
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
    t.stringLiteral(source)
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
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 8:
  // Generate updated code from AST
  // ----------------------------------------------------------

  return { success: true, message: "Import available", filePath };
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
function optimizeImports(
  { filePath }: TaskPayload<"optimizeImports">,
  appContext: AppContext
): TaskResponse<TaskReturn<"optimizeImports">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  // ----------------------------------------------------------
  // STEP 5:
  // Generate updated source code from AST
  // ----------------------------------------------------------

  return {
    success: true,
    message: "Imports optimized successfully",
    updatedCode: generate(ast).code,
    filePath,
  };
}

function updateImportSource(
  { filePath, oldSource, newSource }: TaskPayload<"updateImportSource">,
  appContext: AppContext
): TaskResponse<TaskReturn<"updateImportSource">> {
  // ----------------------------------------------------------
  // STEP 1:
  // Parse source code into AST
  // ----------------------------------------------------------
  const code = fs.readFileSync(filePath, "utf8");
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
  // ----------------------------------------------------------
  // STEP 5:
  // Parse source code into AST
  // ----------------------------------------------------------
  const updatedCode = generate(ast).code;

  // ----------------------------------------------------------
  // STEP 6:
  // Parse source code into AST
  // ----------------------------------------------------------
  helpers.writeFile({ filePath, content: updatedCode });

  return {
    success: true,
    message: "Import source updated successfully",
    filePath,
  };
}

export default {
  createComponent,
  updateComponent,
  deleteComponent,
  moveComponent,
  renameComponent,
  extractComponent,

  createFile,
  deleteFile,
  renameFile,
  moveFile,

  createDirectory,
  deleteDirectory,
  renameDirectory,
  moveDirectory,

  //   insertStyles, // add addStyles
  updateStyles,
  removeStyles,
  renameCssClass,

  // ast
  insertJSX,
  replaceJSX,
  removeJSX,
  moveJSX,
  wrapJSX,

  removeImport,
  ensureImport,
  optimizeImports, // rename it to   organizeImports
  updateImportSource, // rename it to updateImportPath

  // expose only when planner becomes mature enough to use it directly
  insertVariable,
  updateVariable,
  deleteVariable,

  // createFunction,
  // updateFunction,
  // deleteFunction,

  // do not expose
  // generateClassNames,
  // syncComponentStyles,

  // resolveCssClassConflicts,
};
