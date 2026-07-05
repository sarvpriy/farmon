import agents from "../execute/agents/index.js";

import type { Operation, ExecutionContext } from "../schemas/index.js";

import { ERROR_CODES } from "../schemas/index.js";
import { LoomaError } from "../server/error.js";

// -----------------------------------------------------
// Receives a natural language command and context.
// Planner creates an action plan.
// executeAction() executes the action and records history.
// -----------------------------------------------------

async function request(executionContext: ExecutionContext) {
  // -------------------------------------------------------------------------
  // 1. Context Unpacking
  // Extract core utilities and domain parameters from the execution context.
  // -------------------------------------------------------------------------
  const { command, request, logger, appContext, eventBus } = executionContext;

  // -------------------------------------------------------------------------
  // 2. Intent Classification
  // Call the classification agent to discover the intent behind the command.
  // -------------------------------------------------------------------------
  const { category } = await agents.classifyInstruction(
    command,
    executionContext,
  );

  // -------------------------------------------------------------------------
  // 3. Agent Registry / Orchestration Strategy
  // The system routes execution based on the classified category across 4 specialized agents:
  //  - Instruction Classifier : Determines the runtime routing path (Executed above)
  //  - Project Query Agent    : Processes read-only interactions using QueryTaskRegistry
  //  - Code Mutation Agent    : Drives stateful code file edits using MutationTaskRegistry
  //  - Runtime Debug Agent    : Attaches to the environment via RuntimeTaskRegistry
  //  - Refactor Agent         : Handles large-scale restructuring using RefactorTaskRegistry
  // -------------------------------------------------------------------------

  if (category === "QUERY") {
    // Route to read-only analytical flows
    return await agents.queryAgent(executionContext);
  }

  if (category === "MUTATION") {
    // Route to file-writing code modification flows
    return await agents.mutationAgent(executionContext);
  }

  // -------------------------------------------------------------------------
  // 4. Exception Safeguard
  // Reject execution if the intent does not match known systemic categories.
  // -------------------------------------------------------------------------
  throw new LoomaError(
    ERROR_CODES.UNKNOWN_COMMAND,
    "Cannot understand the command.",
  );
}

export default { request };
