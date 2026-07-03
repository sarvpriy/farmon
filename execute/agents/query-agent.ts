import utils from "../../execute/helpers/general.js";
import promptMaker from "../../execute/helpers/prompt-maker.js";

import sse from "../../server/sse.js";

import type { ExecutionContext } from "../../schemas/index.js";

import {
  queryAgentResponseSchema,
  EVENTS,
  ERROR_CODES,
} from "../../schemas/index.js";

import { query } from "../../execute/tasks/index.js";
import { callLLM } from "../../execute/llm/call.js";
import { LoomaError } from "../../server/error.js";
import parsers from "../helpers/parsers.js";
// type LLMResponse = Action[] | JSXResponse | CSSResponse | ComponentResponse;

const taskRegistry = {
  ...query.default,
};

export default async function queryAgent(executionContext: ExecutionContext) {
  sse.emitInfo("Processing query...");
  const { command, eventBus } = executionContext;

  const { queryTasks } = await utils.generateTasksDocs();

  const previousResults: any[] = [];

  for (let step = 0; step < 10; step++) {
    const prompt = promptMaker.createQueryAgentPrompt({
      command,
      taskDocs: queryTasks,
      previousResults: JSON.stringify(previousResults, null, 2),
    });

    eventBus.emit(EVENTS.QUERY_AGENT_PROMPT, { prompt });

    sse.emitInfo(`Calling llm...`);
    const response = await callLLM(prompt, {
      ...executionContext.appContext,
      caller: "query-agent",
    });

    eventBus.emit(EVENTS.QUERY_AGENT_RESPONSE, { response });

    const decision = queryAgentResponseSchema.parse(
      parsers.parseLLMJsonResponse(response)
    );

    if (decision.status === "done") {
      return decision.response;
    }

    eventBus.emit(EVENTS.TASK_STARTED, { decision });

    const result = await executeQueryTask(
      {
        task: decision.task,
        payload: decision.payload,
      },
      executionContext.appContext
    );

    eventBus.emit(EVENTS.TASK_COMPLETED, {
      task: decision.task,
      result,
    });

    previousResults.push({
      task: decision.task,
      result,
    });
  }

  throw new LoomaError(
    ERROR_CODES.QUERY_AGENT_FAILED,
    `Query Agent exceeded maximum iterations.`
  );
}

export async function executeQueryTask({ task, payload }, appContext = {}) {
  const handler = taskRegistry[task];

  if (!handler) {
    throw new LoomaError(ERROR_CODES.TASK_NOT_FOUND, `Unknown task: ${task}`);
  }

  return await handler(
    {
      ...payload,
    },
    appContext
  );
}

// function parser.(response: string) {
//   try {
//     return JSON.parse(response);
//   } catch {
//     try {
//       const extractedData = extractJSONFromLLM(response);

//       // CRITICAL FIX: You must explicitly return the extracted data here
//       return extractedData;
//     } catch (error) {
//       throw new LoomaError(
//         ERROR_CODES.LLM_INVALID_RESPONSE,
//         "LLM's response in invalid JSON",
//         {
//           response,
//           originalError: error instanceof Error ? error.message : String(error),
//         },
//       );
//     }
//   }
// }

// function extractJSONFromLLM(llmResponse) {
//   try {
//     // 1. Clean markdown code blocks if present
//     let cleanedText = llmResponse
//       .replace(/```json/gi, "")
//       .replace(/```/g, "")
//       .trim();

//     // 2. Use regex to find the first '{' or '[' and the last '}' or ']'
//     const jsonMatch = cleanedText.match(/[\{\[]([\s\S]*?)[\}\]]/);

//     if (!jsonMatch) {
//       throw new Error("No JSON structure found in the response.");
//     }

//     // Extract the matched substring including the outer brackets
//     const jsonString = jsonMatch[0];

//     // 3. Attempt to parse the extracted string
//     return JSON.parse(jsonString);
//   } catch (firstError) {
//     // 4. Fallback: Heavy cleaning for common LLM syntax errors
//     try {
//       const sanitized = repairLLMJsonString(llmResponse);
//       return JSON.parse(sanitized);
//     } catch (secondError) {
//       throw new Error(
//         `Failed to parse LLM JSON. Original error: ${firstError.message}`,
//       );
//     }
//   }
// }

// function repairLLMJsonString(text) {
//   // Isolate the text between first '{' and last '}'
//   const start = text.indexOf("{");
//   const end = text.lastIndexOf("}");
//   if (start === -1 || end === -1) throw new Error("Brackets missing");

//   let jsonStr = text.substring(start, end + 1);

//   // Strip trailing commas before closing braces/brackets
//   jsonStr = jsonStr.replace(/,\s*([\]\}])/g, "$1");

//   return jsonStr;
// }
