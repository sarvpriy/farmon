/*

executeAction();
appendAction();
undo();
redo();
rollbackAction();
replayAction();
rollbackSingleOperation();
replaySingleOperation();

*/

import fs from "fs";
import path from "path";
import crypto from "crypto";

import sse from "../../server/sse.js";
import rollback from "../../execute/history/rollback-handlers.js";
import type {
  AppContext,
  Operation,
  TaskResponse,
} from "../../schemas/index.js";

import { ERROR_CODES } from "../../schemas/index.js";

import { LoomaError } from "../../server/error.js";

/**
 * Performs one-step undo.
 *
 * Steps:
 * 1. Read undo.json.
 * 2. Remove the latest operation from undo stack.
 * 3. Execute rollback for that operation.
 * 4. Read redo.json (create if missing).
 * 5. Push the operation onto redo stack.
 * 6. Save both files.
 */
function undo({
  appContext,
}: {
  appContext: AppContext;
}): TaskResponse<{ command: string } | { message: string }> {
  sse.emitInfo("Undoing last instruction...");
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve paths.
  // ----------------------------------------------------------

  const { undoPath, redoPath } = appContext.project;
  // const undoPath = appContext.project.undoPath

  // const redoPath = path.resolve(paths.redo());

  // ----------------------------------------------------------
  // STEP 2:
  // If undo stack doesn't exist, there is nothing to undo.
  // ----------------------------------------------------------

  if (!fs.existsSync(undoPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      "Undo history does not exist",
    );
    // return {
    //   success: false,
    //   message: "Undo history does not exist",
    // };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read undo stack.
  // ----------------------------------------------------------

  const undoStack = JSON.parse(fs.readFileSync(undoPath, "utf8"));

  // ----------------------------------------------------------
  // STEP 4:
  // If stack is empty, nothing to undo.
  // ----------------------------------------------------------

  if (undoStack.length === 0) {
    return {
      success: false,
      message: "Nothing to undo, Stack is clean.",
    };
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Remove latest operation.
  // pop() behaves like a stack.
  // ----------------------------------------------------------

  const action = undoStack.pop();
  // here const logId = undoStack.pop()
  // get logs from ./logs/logid.json
  // ----------------------------------------------------------
  // STEP 6:
  // Save updated undo stack.
  // ----------------------------------------------------------

  fs.writeFileSync(undoPath, JSON.stringify(undoStack, null, 2));

  // ----------------------------------------------------------
  // STEP 7:
  // Execute rollback.
  // rollbackOperation() should perform the inverse
  // of the original operation.
  // ----------------------------------------------------------

  for (const operation of action.operations) {
    const taskName = operation.task;
    const rollbackHandler = rollback.undoHandlers[taskName];
    if (!rollbackHandler) {
      throw new LoomaError(
        ERROR_CODES.FUNCTION_NOT_FOUND,
        `Rollback handler missing for task: ${taskName}`,
      );
    }
    rollbackHandler(operation, appContext);
  }

  // ----------------------------------------------------------
  // STEP 8:
  // Ensure redo.json exists.
  // ----------------------------------------------------------

  if (!fs.existsSync(redoPath)) {
    fs.mkdirSync(path.dirname(redoPath), {
      recursive: true,
    });

    fs.writeFileSync(redoPath, "[]");
  }

  // ----------------------------------------------------------
  // STEP 9:
  // Read redo stack.
  // ----------------------------------------------------------

  const redoStack = JSON.parse(fs.readFileSync(redoPath, "utf8"));

  // ----------------------------------------------------------
  // STEP 10:
  // Push the undone operation onto redo stack.
  // ----------------------------------------------------------

  redoStack.push(action);

  // ----------------------------------------------------------
  // STEP 11:
  // Persist redo stack.
  // ----------------------------------------------------------

  fs.writeFileSync(redoPath, JSON.stringify(redoStack, null, 2));

  // ----------------------------------------------------------
  // STEP 12:
  // Return success.
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Undo complete for this instruction: ${action.command}`,
  };
}

/**
 * Performs one-step redo.
 *
 * Steps:
 * 1. Read redo stack.
 * 2. Remove the latest operation.
 * 3. Re-execute the original task.
 * 4. Push the operation back onto undo stack.
 * 5. Save both files.
 */
function redo({
  appContext,
}: {
  appContext: AppContext;
}): TaskResponse<{ command: string } | { message: string }> {
  sse.emitInfo("Re Appling last instruction...");
  // ----------------------------------------------------------
  // STEP 1:
  // Resolve paths to undo.json and redo.json.
  // ----------------------------------------------------------

  const { undoPath, redoPath } = appContext.project;

  // const undoPath = path.resolve(LOOMA_UNDO_PATH);

  // const redoPath = path.resolve(LOOMA_REDO_PATH);

  // ----------------------------------------------------------
  // STEP 2:
  // If redo stack does not exist, there is nothing to redo.
  // ----------------------------------------------------------

  if (!fs.existsSync(redoPath)) {
    throw new LoomaError(
      ERROR_CODES.FILE_NOT_FOUND,
      "Redo history does not exist",
    );
    // return {
    //   success: false,
    //   message: "Redo history does not exist",
    // };
  }

  // ----------------------------------------------------------
  // STEP 3:
  // Read redo stack.
  // ----------------------------------------------------------

  const redoStack = JSON.parse(fs.readFileSync(redoPath, "utf8"));

  // ----------------------------------------------------------
  // STEP 4:
  // If redo stack is empty, nothing to redo.
  // ----------------------------------------------------------

  if (redoStack.length === 0) {
    return {
      success: false,
      message: "Nothing to redo",
    };
  }

  // ----------------------------------------------------------
  // STEP 5:
  // Remove the latest operation from redo stack.
  // ----------------------------------------------------------

  const action = redoStack.pop();

  // ----------------------------------------------------------
  // STEP 6:
  // Re-execute the original task.
  //
  // IMPORTANT:
  // This execution should NOT append a new operation
  // into undo history because we are merely replaying
  // an existing operation.
  // ----------------------------------------------------------

  // ----------------------------------------------------------
  // STEP 7:
  // Execute redo.
  // ----------------------------------------------------------

  for (const operation of action.operations) {
    const taskName = operation.task;
    const redoHandler = rollback.redoHandlers[taskName];
    if (!redoHandler) {
      throw new LoomaError(
        ERROR_CODES.FUNCTION_NOT_FOUND,
        `Redo handler missing for task: ${taskName}`,
      );
    }
    redoHandler(operation, appContext);
  }

  // const result = await executeAction({
  //   actions: action.operations,
  //   componentContext,
  // });

  // ----------------------------------------------------------
  // STEP 7:
  // If redo failed, restore redo stack and abort.
  // ----------------------------------------------------------

  // if (!result.success) {
  //   redoStack.push(action);

  //   fs.writeFileSync(redoPath, JSON.stringify(redoStack, null, 2));

  //   return {
  //     success: false,
  //     action,
  //   };
  // }

  // ----------------------------------------------------------
  // STEP 8:
  // Persist updated redo stack.
  // ----------------------------------------------------------

  fs.writeFileSync(redoPath, JSON.stringify(redoStack, null, 2));

  // ----------------------------------------------------------
  // STEP 9:
  // Ensure undo stack exists.
  // ----------------------------------------------------------

  if (!fs.existsSync(undoPath)) {
    fs.mkdirSync(path.dirname(undoPath), {
      recursive: true,
    });

    fs.writeFileSync(undoPath, "[]");
  }

  // ----------------------------------------------------------
  // STEP 10:
  // Read undo stack.
  // ----------------------------------------------------------

  const undoStack = JSON.parse(fs.readFileSync(undoPath, "utf8"));

  // ----------------------------------------------------------
  // STEP 11:
  // Push the operation back onto undo stack.
  // ----------------------------------------------------------

  undoStack.push(action);

  // ----------------------------------------------------------
  // STEP 12:
  // Persist undo stack.
  // ----------------------------------------------------------

  fs.writeFileSync(undoPath, JSON.stringify(undoStack, null, 2));

  // ----------------------------------------------------------
  // STEP 13:
  // Return success.
  // ----------------------------------------------------------

  return {
    success: true,
    message: `Re applied this instruction: ${action.command}`,
  };
}

/**
 * Creates a new Looma operation log session.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * Every mutation Looma performs should be traceable
 * and reversible.
 *
 * Instead of storing all mutations in memory,
 * Looma persists them into session log files.
 *
 * Each session gets its own JSONL file:
 *
 * .looma/operations/session_xxx.jsonl
 *
 * JSONL = one JSON object per line.
 *
 * This architecture is:
 * - append friendly
 * - crash resistant
 * - scalable
 * - streamable
 * - easy to rollback
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * - ensures .looma directory exists
 * - ensures operations directory exists
 * - creates a new session log file
 * - writes session metadata
 * - returns session information
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * {
 *   sessionId,
 *   logFilePath,
 *   createdAt
 * }
 *
 */
function createOperationLog(context: AppContext) {
  // ----------------------------------------------------------
  // STEP 1:
  // Generate unique session id
  // ----------------------------------------------------------
  //
  // We combine:
  // - timestamp
  // - random bytes
  //
  // This avoids collisions between sessions.
  //
  // Example:
  //
  // session_1748450000_a82bc91f
  //
  // ----------------------------------------------------------

  const sessionId = `session_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}`;

  // ----------------------------------------------------------
  // STEP 2:
  // Resolve .looma directory path
  // ----------------------------------------------------------
  //
  // All Looma internal files should stay isolated
  // from user application code.
  //
  // Example:
  //
  // /my-project/.looma
  //
  // ----------------------------------------------------------

  const logsDirectoryPath = context.project.logsDir;

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve operations directory path
  // ----------------------------------------------------------
  //
  // This directory stores all session logs.
  //
  // Example:
  //
  // /my-project/.looma/operations
  //
  // ----------------------------------------------------------

  const operationsDirectoryPath = path.join(logsDirectoryPath, "operations");

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure .looma directory exists
  // ----------------------------------------------------------
  //
  // mkdirSync with recursive:true safely creates:
  //
  // - parent directories
  // - nested directories
  //
  // and does nothing if already existing.
  //
  // ----------------------------------------------------------

  fs.mkdirSync(logsDirectoryPath, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 5:
  // Ensure operations directory exists
  // ----------------------------------------------------------

  fs.mkdirSync(operationsDirectoryPath, {
    recursive: true,
  });

  // ----------------------------------------------------------
  // STEP 6:
  // Create session log file path
  // ----------------------------------------------------------
  //
  // Example:
  //
  // session_1748450000_abcd1234.jsonl
  //
  // ----------------------------------------------------------

  const logFilePath = path.join(operationsDirectoryPath, `${sessionId}.jsonl`);

  // ----------------------------------------------------------
  // STEP 7:
  // Create initial session metadata object
  // ----------------------------------------------------------
  //
  // This acts as the first entry in the log.
  //
  // Useful later for:
  // - debugging
  // - recovery
  // - analytics
  // - session restoration
  //
  // ----------------------------------------------------------

  const sessionMetadata = {
    type: "SESSION_START",

    sessionId,

    createdAt: new Date().toISOString(),

    version: 1,
  };

  // ----------------------------------------------------------
  // STEP 8:
  // Write metadata as first JSONL line
  // ----------------------------------------------------------
  //
  // JSONL format:
  //
  // {"type":"SESSION_START",...}
  //
  // Every line is independent JSON.
  //
  // We append newline at end because:
  //
  // - easier streaming
  // - easier appending
  // - easier parsing
  //
  // ----------------------------------------------------------

  fs.writeFileSync(logFilePath, JSON.stringify(sessionMetadata) + "\n", "utf8");

  // ----------------------------------------------------------
  // STEP 9:
  // Return session information
  // ----------------------------------------------------------

  return {
    sessionId,

    logFilePath,

    createdAt: sessionMetadata.createdAt,
  };
}

/**
 * Appends a mutation operation into current session log.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {string} params.logFilePath
 * Absolute path of current session JSONL log file.
 *
 * Example:
 * /project/.looma/operations/session_xxx.jsonl
 *
 * @param {string} params.taskName
 * Name of executed task.
 *
 * Example:
 * - updateStyles
 * - insertJSX
 * - renameComponent
 *
 * @param {Object} params.target
 * Information about mutation target.
 *
 * Structure depends on task type.
 *
 * Example:
 * {
 *   cssPath: "/src/Header.css"
 * }
 *
 * @param {Object} params.before
 * Snapshot BEFORE mutation.
 *
 * Structure depends on task type.
 *
 * Example:
 * {
 *   cssCode: ".header { color:red; }"
 * }
 *
 * @param {Object} params.after
 * Snapshot AFTER mutation.
 *
 * Structure depends on task type.
 *
 * Example:
 * {
 *   cssCode: ".header { color:blue; }"
 * }
 *
 * @param {Object} params.metadata
 * Additional optional debugging metadata.
 *
 * Example:
 * {
 *   plannerTaskId,
 *   executionTime,
 *   triggeredBy
 * }
 */
function appendOperation({
  logFilePath,
  taskName,
  target,
  before,
  after,
  metadata = {},
}) {
  // ----------------------------------------------------------
  // STEP 1:
  // Generate unique operation id
  // ----------------------------------------------------------
  //
  // Each operation should be independently identifiable.
  //
  // Useful later for:
  // - rollback
  // - debugging
  // - tracing
  // - operation references
  //
  // ----------------------------------------------------------

  const operationId = `op_${Date.now()}_${crypto
    .randomBytes(4)
    .toString("hex")}`;

  // ----------------------------------------------------------
  // STEP 2:
  // Create operation object
  // ----------------------------------------------------------
  //
  // This object represents one mutation event.
  //
  // Example:
  //
  // {
  //   id,
  //   taskName,
  //   before,
  //   after
  // }
  //
  // ----------------------------------------------------------

  const operation = {
    id: operationId,

    type: "OPERATION",

    timestamp: new Date().toISOString(),

    taskName,

    target,

    before,

    after,

    metadata,
  };

  // ----------------------------------------------------------
  // STEP 3:
  // Convert operation into JSONL line
  // ----------------------------------------------------------
  //
  // JSONL requires:
  //
  // one JSON object per line
  //
  // ----------------------------------------------------------

  const operationLine = JSON.stringify(operation) + "\n";

  // ----------------------------------------------------------
  // STEP 4:
  // Append operation into session file
  // ----------------------------------------------------------
  //
  // appendFileSync adds operation
  // without overwriting previous logs.
  //
  // ----------------------------------------------------------
  console.log("Appending operation: ", taskName, operationId);
  fs.appendFileSync(logFilePath, operationLine, "utf8");

  // ----------------------------------------------------------
  // STEP 5:
  // Return appended operation
  // ----------------------------------------------------------

  return operation;
}

/**
 * Rolls back a single Looma operation.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * AI generated mutations are never guaranteed to be correct.
 *
 * Even with:
 * - planners
 * - validators
 * - AST mutations
 *
 * mistakes can still happen.
 *
 * This function provides safety by restoring
 * the system to its previous state.
 *
 * ------------------------------------------------------------
 * HOW ROLLBACK WORKS
 * ------------------------------------------------------------
 *
 * Every mutation operation stores:
 *
 * {
 *   before: ...
 *   after: ...
 * }
 *
 * Rollback simply restores:
 *
 * BEFORE STATE
 *
 * ------------------------------------------------------------
 * IMPORTANT ARCHITECTURE DECISION
 * ------------------------------------------------------------
 *
 * Rollback logic is TASK SPECIFIC.
 *
 * Example:
 *
 * updateStyles rollback:
 *   restore old cssCode
 *
 * moveFile rollback:
 *   move file back
 *
 * renameComponent rollback:
 *   restore old component name
 *
 * Therefore:
 *
 * rollbackHandlers map task types
 * to rollback implementations.
 *
 * ------------------------------------------------------------
 * WHAT THIS FUNCTION DOES
 * ------------------------------------------------------------
 *
 * - finds operation
 * - validates rollback support
 * - calls task-specific rollback handler
 * - appends rollback entry into operation log
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {Object} params.operation
 * Previously logged operation object.
 *
 * Example:
 * {
 *   id,
 *   taskName,
 *   before,
 *   after
 * }
 *
 * @param {Object} params.rollbackHandlers
 * Map of rollback handlers by task name.
 *
 * Example:
 * {
 *   updateStyles: fn,
 *   moveFile: fn,
 *   renameComponent: fn
 * }
 *
 * Every task type has different rollback logic.
 *
 * @param {string} params.logFilePath
 * Absolute path of current session JSONL log file.
 *
 * Used for appending rollback history entry.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * {
 *   success: boolean,
 *   operationId,
 *   taskName
 * }
 *
 */
function rollbackOperation({
  operation,
  rollbackHandlers,
}: {
  operation: Operation;
  rollbackHandlers: any;
}): {} {
  // ----------------------------------------------------------
  // STEP 1:
  // Validate operation existence
  // ----------------------------------------------------------
  //
  // Rollback cannot happen without operation data.
  //
  // ----------------------------------------------------------

  if (!operation) {
    throw new LoomaError(
      ERROR_CODES.PAYLOAD_ERROR,
      "Operation is required for rollback.",
    );
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Extract task name
  // ----------------------------------------------------------
  //
  // Example:
  //
  // updateStyles
  // moveFile
  // renameComponent
  //
  // ----------------------------------------------------------

  const taskName = operation.task;

  // ----------------------------------------------------------
  // STEP 3:
  // Resolve rollback handler
  // ----------------------------------------------------------
  //
  // Every task has different rollback logic.
  //
  // Example:
  //
  // rollbackHandlers.updateStyles
  //
  // ----------------------------------------------------------

  const rollbackHandler = rollbackHandlers[taskName];

  // ----------------------------------------------------------
  // STEP 4:
  // Ensure rollback handler exists
  // ----------------------------------------------------------
  //
  // Without rollback handler,
  // operation cannot be reverted safely.
  //
  // ----------------------------------------------------------

  if (!rollbackHandler) {
    throw new LoomaError(
      ERROR_CODES.FUNCTION_NOT_FOUND,
      `Rollback handler missing for task: ${taskName}`,
    );
  }

  try {
    // ----------------------------------------------------------
    // STEP 5:
    // Execute rollback handler
    // ----------------------------------------------------------
    //
    // Handler restores BEFORE state.
    //
    // Example:
    //
    // restore previous CSS
    // restore deleted file
    // restore previous JSX
    //
    // ----------------------------------------------------------
    rollbackHandler(operation);

    // ----------------------------------------------------------
    // STEP 6:
    // Create rollback log entry
    // ----------------------------------------------------------
    //
    // Rollback itself should also be logged.
    //
    // This is important for:
    //
    // - debugging
    // - history tracking
    // - redo support
    // - future time-travel systems
    //
    // ----------------------------------------------------------

    // const rollbackEntry = {
    //   type: "ROLLBACK",

    //   rolledBackOperationId: operation.id,

    //   taskName,

    //   timestamp: new Date().toISOString(),
    // };

    // ----------------------------------------------------------
    // STEP 7:
    // Append rollback entry into session log
    // ----------------------------------------------------------
    //
    // JSONL format:
    //
    // one JSON object per line
    //
    // ----------------------------------------------------------

    // fs.appendFileSync(
    //   logFilePath,
    //   JSON.stringify(rollbackEntry) + "\n",
    //   "utf8"
    // );

    // ----------------------------------------------------------
    // STEP 8:
    // Return rollback result
    // ----------------------------------------------------------

    return {
      success: true,

      taskName,
    };
  } catch (error) {
    return {
      success: false,

      taskName,

      error,
    };
  }
}

/**
 * Rolls back all operations AFTER a target operation.
 *
 * ------------------------------------------------------------
 * WHY THIS FUNCTION EXISTS
 * ------------------------------------------------------------
 *
 * rollbackOperation() reverts only ONE operation.
 *
 * But sometimes we need to restore the project
 * to an earlier stable checkpoint.
 *
 * Example:
 *
 * op1 -> createComponent
 * op2 -> updateStyles
 * op3 -> insertJSX
 * op4 -> renameComponent
 * op5 -> moveFile
 *
 * rollbackToOperation(op2)
 *
 * Result:
 * - op5 reverted
 * - op4 reverted
 * - op3 reverted
 *
 * Final project state becomes exactly as it was
 * after op2 execution.
 *
 * ------------------------------------------------------------
 * IMPORTANT
 * ------------------------------------------------------------
 *
 * Rollback must happen in REVERSE ORDER.
 *
 * Example:
 *
 * Original order:
 * op1 -> op2 -> op3
 *
 * Rollback order:
 * op3 -> op2 -> op1
 *
 * This is critical because later operations
 * may depend on earlier mutations.
 *
 * ------------------------------------------------------------
 * PARAMS
 * ------------------------------------------------------------
 *
 * @param {Object} params
 *
 * @param {Array<Object>} params.operations
 * Array of all session operations.
 *
 * Example:
 * [
 *   operation1,
 *   operation2,
 *   operation3
 * ]
 *
 * @param {string} params.targetOperationId
 * Rollback checkpoint operation id.
 *
 * All operations AFTER this operation
 * will be reverted.
 *
 * @param {Object} params.rollbackHandlers
 * Map of rollback handlers by task name.
 *
 * Example:
 * {
 *   updateStyles: fn,
 *   moveFile: fn
 * }
 *
 * @param {string} params.logFilePath
 * Absolute path of current session log file.
 *
 * Used for appending rollback history.
 *
 * ------------------------------------------------------------
 * RETURNS
 * ------------------------------------------------------------
 *
 * {
 *   success: boolean,
 *   rollbackCount: number,
 *   targetOperationId: string,
 *   revertedOperationIds: string[]
 * }
 *
 */
function rollbackToOperation({
  operations,
  targetOperationId,
  rollbackHandlers,
  logFilePath,
}) {
  // ----------------------------------------------------------
  // STEP 1:
  // Validate operations list
  // ----------------------------------------------------------

  if (!Array.isArray(operations)) {
    throw new LoomaError(
      ERROR_CODES.PAYLOAD_ERROR,
      "operations must be an array.",
    );
  }

  // ----------------------------------------------------------
  // STEP 2:
  // Find checkpoint operation index
  // ----------------------------------------------------------
  //
  // Example:
  //
  // [
  //   op1,
  //   op2,
  //   op3,
  //   op4
  // ]
  //
  // target = op2
  //
  // index = 1
  //
  // ----------------------------------------------------------

  const checkpointIndex = operations.findIndex(
    (operation) => operation.id === targetOperationId,
  );

  // ----------------------------------------------------------
  // STEP 3:
  // Ensure checkpoint exists
  // ----------------------------------------------------------

  if (checkpointIndex === -1) {
    throw new LoomaError(
      ERROR_CODES.ROLLBACK_ERROR,
      `Target operation not found: ${targetOperationId}`,
    );
  }

  // ----------------------------------------------------------
  // STEP 4:
  // Extract operations that need rollback
  // ----------------------------------------------------------
  //
  // We rollback ALL operations AFTER checkpoint.
  //
  // Example:
  //
  // checkpoint = op2
  //
  // rollback:
  // op3
  // op4
  // op5
  //
  // ----------------------------------------------------------

  const operationsToRollback = operations.slice(checkpointIndex + 1);

  // ----------------------------------------------------------
  // STEP 5:
  // Reverse rollback order
  // ----------------------------------------------------------
  //
  // Rollback must happen backwards.
  //
  // Latest mutation gets reverted first.
  //
  // ----------------------------------------------------------

  operationsToRollback.reverse();

  // ----------------------------------------------------------
  // STEP 6:
  // Prepare rollback tracking array
  // ----------------------------------------------------------

  const revertedOperationIds = [];

  // ----------------------------------------------------------
  // STEP 7:
  // Rollback operations one by one
  // ----------------------------------------------------------

  for (const operation of operationsToRollback) {
    // --------------------------------------------------------
    // Resolve rollback handler
    // --------------------------------------------------------

    const rollbackHandler = rollbackHandlers[operation.taskName];

    // --------------------------------------------------------
    // Ensure rollback handler exists
    // --------------------------------------------------------

    if (!rollbackHandler) {
      throw new LoomaError(
        ERROR_CODES.FUNCTION_NOT_FOUND,
        `Rollback handler missing for task: ${operation.taskName}`,
      );
    }

    // --------------------------------------------------------
    // Execute rollback
    // --------------------------------------------------------

    rollbackHandler(operation);

    // --------------------------------------------------------
    // Store reverted operation id
    // --------------------------------------------------------

    revertedOperationIds.push(operation.id);

    // --------------------------------------------------------
    // Append rollback entry into session log
    // --------------------------------------------------------

    const rollbackEntry = {
      type: "ROLLBACK",

      rolledBackOperationId: operation.id,

      taskName: operation.taskName,

      timestamp: new Date().toISOString(),
    };

    fs.appendFileSync(
      logFilePath,
      JSON.stringify(rollbackEntry) + "\n",
      "utf8",
    );
  }

  // ----------------------------------------------------------
  // STEP 8:
  // Return rollback result
  // ----------------------------------------------------------

  return {
    success: true,

    rollbackCount: revertedOperationIds.length,

    targetOperationId,

    revertedOperationIds,
  };
}

function rollbackAction({ operations }) {
  console.log("rolling back actions");
}

function getOperations(logFilePath) {
  const content = fs.readFileSync(logFilePath, "utf8");

  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function getLatestOperation(logFilePath) {
  const operations = getOperations(logFilePath);
  const latestOperation = operations.at(-1);
  // console.log("Latest operation: ", latestOperation);
  return latestOperation;
}

export default {
  createOperationLog,
  appendOperation,
  rollbackOperation,
  rollbackToOperation,
  getLatestOperation,
  undo,
  redo,
  rollbackAction,
};
