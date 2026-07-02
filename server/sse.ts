/*

SSE Events

Purpose:

Realtime UI updates

User should see them immediately.

Examples:

TASK_STARTED
TASK_COMPLETED
TASK_FAILED

STATUS

HEALTH_CHANGED

CONFIRMATION_REQUIRED


Rule: Show what Looma is doing, not what the LLM is thinking. Avoid messages like "Thinking..." or exposing chain-of-thought.


I'd keep them high-level and user-friendly:

Common
Understanding your request...
Collecting project context...
Planning next steps...
Executing plan...
Preparing response...


Project Query Agent
Reading package.json...
Reading README...
Reading project configuration...
Reading project files...
Searching the codebase...
Searching for references...
Reading component...
Gathering project information...
Preparing response...

Code Query Agent
Locating component...
Reading component source...
Searching for usages...
Inspecting imports...
Inspecting exports...
Analyzing component...
Preparing explanation...

Runtime Debug Agent
Inspecting runtime...
Reading runtime snapshot...
Checking visible components...
Checking current route...
Inspecting runtime errors...
Analyzing runtime state...
Preparing diagnosis...

Code Mutation Agent
Generating code...
Creating component...
Creating directory...
Updating JSX...
Updating CSS...
Updating imports...
Formatting code...
Validating changes...
Applying changes...
Rolling back changes...

Refactor Agent
Analyzing component structure...
Finding dependencies...
Extracting component...
Updating references...
Cleaning up imports...
Validating refactor...

Completion
Done.
Unable to complete the request.

*/

import { SSE_EVENTS } from "../schemas/index.js";
import type { SSEEventType } from "../schemas/index.js";

const clients: any = [];

function emit(type: SSEEventType, data: any) {
  for (const client of clients) {
    client.write(
      `data: ${JSON.stringify({
        type,
        ...data,
      })}\n\n`,
    );
  }
}
function emitInfo(text) {
  emit(SSE_EVENTS.STATUS, {
    message: text,
  });
}

function emitProgress(text) {
  emit(SSE_EVENTS.PROGRESS, {
    text,
  });
}

function emitTaskStart({ taskId, task }) {
  emit(SSE_EVENTS.TASK_STARTED, {
    taskId,
    task,
    timestamp: new Date().toISOString(),
  });
}

function emitTaskComplete({ taskId, task, taskOutput = {}, success = true }) {
  emit(SSE_EVENTS.TASK_COMPLETED, {
    taskId,
    task,
    taskOutput,
    success,
    timestamp: new Date().toISOString(),
  });
}

function emitError(error) {
  emit(SSE_EVENTS.ERROR, {
    message: error.message,
    stack: error.stack,
    timestamp: new Date().toISOString(),
  });
}

export default {
  clients,
  emit,
  emitInfo,
  emitProgress,
  emitTaskStart,
  emitTaskComplete,
  emitError,
};
