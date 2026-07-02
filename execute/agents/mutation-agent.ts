import fs from "fs";
import crypto from "crypto";

import history from "../../execute/history/history-manager.js";
import sse from "../../server/sse.js";
import generalHelpers from "../../execute/helpers/general.js";
import rollback from "../../execute/history/rollback-handlers.js";

import promptMaker from "../../execute/helpers/prompt-maker.js";

import { callLLM } from "../../execute/llm/call.js";
import { getComponentContext } from "../../server/app-context.js";
import {
  plannerResponseSchema,
  jsxResponseSchema,
  cssResponseSchema,
  componentResponseSchema,
  queryAgentResponseSchema,
  ERROR_CODES,
} from "../../schemas/index.js";

import {
  ast,
  mutations,
  helpers,
  generators,
  query,
} from "../../execute/tasks/index.js";
import type {
  AppContext,
  ComponentContext,
  AnalyaseCommandReturns,
  Operation,
  Action,
  ExecutionContext,
  InstructionClassification,
  AnalyaseCommandParams,
} from "../../schemas/index.js";

import {
  EVENTS,
  TaskRegistry,
  instructionClassificationSchema,
} from "../../schemas/index.js";
import { LoomaError } from "../../server/error.js";
import parsers from "../helpers/parsers.js";
// import { buildInstructionClassifierPrompt } from "../../execute/helpers/prompt-maker.js";
// import invokeLLM, { callLLM, } from "../../execute/llm/llm.js";
import validator from "../../execute/helpers/validators.js";

const taskRegistry = {
  // ...ast.default,
  ...mutations.default,
  ...generators.default,
};

export async function executeTask(
  {
    task,
    payload,
    taskOutputs,
  }: {
    task: keyof typeof taskRegistry;
    payload: unknown;
    taskOutputs: object;
  },
  appContext: AppContext,
) {
  const resolvedPayload = generalHelpers.resolveTaskReferences({
    value: payload,
    taskOutputs,
  });
  console.log(
    `\n\nExecuting task: ${task} with resolvedPayload:`,
    resolvedPayload,
  );

  const schema = TaskRegistry[task];

  const validatedPayload = schema.payload.parse(resolvedPayload);

  const handler = taskRegistry[task];

  if (!handler) {
    throw new LoomaError(ERROR_CODES.TASK_NOT_FOUND, "Unknown task", {
      task,
    });
  }

  return await handler(
    {
      ...validatedPayload,
    },
    appContext,
  );
}

// -------------------------------------------------
// Execute action and append to history.
// -------------------------------------------------

async function executeAction({
  actions,
  executionContext,
}: {
  actions: Action[];
  executionContext: ExecutionContext;
}): Promise<{
  success: boolean;
  operations?: Operation[];
  responseMessage: string[];
}> {
  sse.emitInfo("Executing action plan...");

  const { componentContext, eventBus } = executionContext;

  // ----------------------------------------------------------
  // This object acts as shared memory between tasks.
  //
  // Each task output is stored using its taskId so that
  // subsequent tasks can reference previous outputs.
  // ----------------------------------------------------------

  const taskOutputs: Record<string, unknown> = {
    componentContext,
  };

  const mutationTasks =
    await generalHelpers.getExportedFunctionNames("mutation");

  // ----------------------------------------------------------
  // Collect mutation operations so that the entire action
  // can be rolled back if any task fails.
  // ----------------------------------------------------------

  const operations: Operation[] = [];

  const responseMessage = [];

  try {
    // ----------------------------------------------------------
    // Execute tasks sequentially.
    //
    // Ordering matters because later tasks may depend on
    // outputs produced by earlier tasks.
    // ----------------------------------------------------------

    for (const { taskId, task, payload } of actions) {
      // logger.addStep("TASK_STARTED", { taskId, task, payload });

      // sse.emitTaskStart({
      //   taskId,
      //   task,
      // });

      eventBus.emit(EVENTS.TASK_STARTED, { taskId, task, payload });

      // ----------------------------------------------------------
      // Execute the task.
      // ----------------------------------------------------------

      const taskOutput = await executeTask(
        {
          task: task as keyof typeof taskRegistry,
          payload,
          taskOutputs,
        },
        executionContext.appContext,
      );

      eventBus.emit(EVENTS.TASK_COMPLETED, { taskId, task, payload });

      // ----------------------------------------------------------
      // Store task output for future tasks.
      // ----------------------------------------------------------

      taskOutputs[taskId] = taskOutput;

      // ----------------------------------------------------------
      // Mutation tasks produce operations that can later be
      // undone or redone.
      // ----------------------------------------------------------

      if (mutationTasks.includes(task)) {
        const operation = rollback.operationSerializers[task]({
          payload,
          result: taskOutput,
        });

        responseMessage.push(taskOutput.message);

        operations.push({
          taskId,
          task,
          payload,
          taskOutput,
          ...operation,
        });
      }
    }

    // ----------------------------------------------------------
    // Entire action executed successfully.
    // ----------------------------------------------------------

    return {
      success: true,
      operations,
      responseMessage,
    };
  } catch (error) {
    const originalError =
      error instanceof Error ? error : new Error(String(error));

    console.error(
      `Operation failed: ${originalError.message}. Rolling back...`,
    );

    const details =
      originalError instanceof LoomaError ? originalError.details : {};

    eventBus.emit(EVENTS.TASK_FAILED, {
      message: originalError.message,
      ...(details as object),
    });

    try {
      history.rollbackAction({ operations });

      throw new LoomaError(
        ERROR_CODES.TASK_EXECUTION_FAILED,
        originalError.message,
        originalError,
      );
    } catch (rollbackError) {
      const rollback =
        rollbackError instanceof Error
          ? rollbackError
          : new Error(String(rollbackError));

      console.error("CRITICAL: Failed to rollback operations.", rollback);

      throw new LoomaError(
        ERROR_CODES.ROLLBACK_FAILED,
        `Task execution failed and rollback was unsuccessful.`,
        {
          originalError,
          rollbackError: rollback,
          operations,
        },
      );
    }
  }
}

export default async function mutationAgent(
  executionContext: ExecutionContext,
) {
  const {
    command,

    request,

    logger,

    appContext,

    eventBus,
  } = executionContext;

  const { componentId } = request;
  const { componentRegistry } = appContext;
  // ----------------------------------------------------------
  // STEP 2:
  // Resolve the selected component's context.
  // This provides the LLM with information about the component
  // the user is currently working on.
  // ----------------------------------------------------------

  const componentContext = getComponentContext({
    componentId,
    componentRegistry,
  });

  if (!componentContext) {
    throw new LoomaError(
      ERROR_CODES.COMPONENT_NOT_FOUND,
      `Component context not found for componentId: ${componentId}`,
    );
  }

  eventBus.emit(EVENTS.COMPONENT_CONTEXT, { componentContext });

  executionContext.componentContext = componentContext;

  // -------------------------------------------------
  // Ask planner to create action plan.
  // -------------------------------------------------

  const plan: AnalyaseCommandReturns = await gereratePlan(executionContext);

  eventBus.emit(EVENTS.PLAN_GENERATED, { actions: plan.actions });

  const actionExecutionResult = await executeAction({
    actions: plan.actions,
    executionContext,
  });

  generalHelpers.appendAction({
    command,
    operations: actionExecutionResult.operations,
    undoPath: executionContext.appContext.project.undoPath,
  });

  // Prepare proper response

  return "Done! " + actionExecutionResult.responseMessage.join(", ");
}

/**
 *
 * 
 * You should provide:
 * - user command
 * - selected component context
 * - available task definitions
 * - architectural constraints
 * - response schema
 * - hard rules

 * @param { command, componentCode} param0
 * @returns actions []  having task and related prompt
 */
async function gereratePlan(
  executionContext: ExecutionContext,
): Promise<AnalyaseCommandReturns> {
  sse.emitInfo("Generating plan...");
  const {
    command,

    logger,

    appContext,

    componentContext,

    eventBus,
  } = executionContext;

  let basePrompt = await promptMaker.generatePlannerPrompt({
    command,
    componentContext,
    projectDependencies: appContext.projectDependencies,
  });

  let previousError: string | null = null;

  let actions: Action[];

  // let caller: "planner" | "jsx" | "css" | "component";

  const MAX_RETRIES = 3;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // 1. Construct the prompt fresh for this specific attempt
      let activePrompt = basePrompt;

      if (previousError) {
        activePrompt += `
            Previous attempt produced invalid response.
  
            Error:
            ${previousError}
            
            Avoid repeating this error and regenerate the entire code.
          `;
      }

      let response: string;

      sse.emitInfo(`Calling llm...`);
      eventBus.emit(EVENTS.PLANNER_PROMPT, { prompt: basePrompt });
      response = await callLLM(activePrompt, {
        ...executionContext.appContext,
        caller: "mutation-agent",
      });
      eventBus.emit(EVENTS.PLANNER_RESPONSE, { response });

      const parsedResponse = parsers.parseLLMJsonResponse(response);
      eventBus.emit(EVENTS.PLANNER_RESPONSE, { parsedResponse });

      validator.validateResponse({
        response: parsedResponse,
      });

      actions = parsedResponse;

      // update it for caller
      // if caller is jsx, css, componentCode
      // then only format code
      // otherwise check schema
      // if (caller !== "planner") {
      //   return formatObjectCode(parsedResponse);
      // }

      return { actions };
    } catch (error) {
      console.error(`generatePlan [Attempt ${attempt}]:`, error.message); // Error: LLM returned very invalid JSON.

      eventBus.emit(EVENTS.ERROR, { message: error.message });

      previousError = error.message;

      // 5. If we've exhausted all retries, throw the error so the UI knows it completely failed
      if (attempt === MAX_RETRIES) {
        throw new LoomaError(
          ERROR_CODES.LLM_INVALID_RESPONSE,
          `LLM generation failed after ${MAX_RETRIES} attempts. Last error: ${error.message}`,
        );
      }
    }
  }
}

/*
// === EXAMPLE USAGE ===
const messyLLMResponse = `
Sure! Here is the user data you requested:
\`\`\`json
{
  "id": 101,
  "name": "Alex Carter",
  "roles": ["admin", "editor"],
}
\`\`\`
Let me know if you need anything else!`;

try {
  const data = extractJSONFromLLM(messyLLMResponse);
  console.log("Successfully extracted object:", data);
} catch (error) {
  console.error("Extraction failed:", error.message);
}

*/
