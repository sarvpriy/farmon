import fs from "fs";
import path from "path";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import "module-alias/register";
import utils from "../../execute/helpers/general.js";
import sse from "../../server/sse.js";
import type { Action, AppContext } from "../../schemas/index.js";

import {
  plannerResponseSchema,
  jsxResponseSchema,
  cssResponseSchema,
  componentResponseSchema,
  ERROR_CODES,
} from "../../schemas/index.js";

import { loadConfig } from "../../server/config.js";
import { getProvider } from "../../providers/index.js";
import { LoomaError } from "../../server/error.js";

export async function callLLM(
  prompt: string,
  ctx: AppContext & Record<"caller", string>,
): Promise<string> {
  if (process.env.CALL_LLM === "manual") {
    return await manualyCallLLM(
      {
        prompt,
      },
      ctx,
    );
  }

  const provider = getProvider(ctx.config.llm);
  return provider.chat(prompt);
}

export async function manualyCallLLM({ prompt }, ctx) {
  // put prompt in a file

  const { caller } = ctx;

  const llmGeneration = {
    planner: "llm-response.sample",
    jsx: "llm-generated-jsx.sample",
    css: "llm-generated-css.sample",
    component: "llm-generated-component.sample",
  };
  const llmResposeFile = llmGeneration[caller];

  if (caller === "planner") {
    fs.writeFileSync(
      path.resolve(ctx.project.logsDir, "samples", "planner-prompt.sample"),
      prompt,
      "utf8",
    );
    console.log(`Go to planner-prompt.sample to get latest prompt`);
  }

  const rl = readline.createInterface({ input, output });

  // wait for llm output
  // put llm output in a file
  const name = await rl.question(
    `Did you pasted LLM generated ${caller} response: `,
  );

  // read llm output from a file
  const llmResponse = fs.readFileSync(
    path.resolve(ctx.project.logsDir, "samples", llmResposeFile),
    "utf8",
  );

  console.log(`LLM Response: ${llmResponse}!`);

  rl.close();

  return new Promise<string>((resolve, reject) => {
    try {
      // const result: LLMResponse = JSON5.parse(llmResponse);
      resolve(llmResponse);
    } catch (error) {
      console.error("Failed to parse LLM response:", error);
      reject(error);
    }
  });
}

// function parseLLMJsonResponse(response: string) {
//   try {
//     return JSON.parse(response);
//   } catch {
//     throw new LoomaError(
//       ERROR_CODES.LLM_INVALID_RESPONSE,
//       "LLM returned invalid JSON.",
//     );
//   }
// }

// function formatObjectCode(obj) {
//   const result = { ...obj };

//   const keysToFormat = ["code", "css", "component"];

//   for (const key of keysToFormat) {
//     if (typeof result[key] === "string") {
//       result[key] = utils.formatCode(result[key]);
//     }
//   }

//   return result;
// }

// function validateResponse({
//   response,
//   caller,
// }: {
//   response: unknown;
//   caller: "planner" | "jsx" | "css" | "component";
// }) {
//   const schemaByCaller = {
//     planner: plannerResponseSchema,
//     jsx: jsxResponseSchema,
//     css: cssResponseSchema,
//     component: componentResponseSchema,
//   } as const;

//   const schema = schemaByCaller[caller];

//   const result = schema.safeParse(response);
//   if (!result.success) {
//     throw new LoomaError(
//       ERROR_CODES.LLM_INVALID_RESPONSE,
//       result.error.issues.map((i) => i.message).join(", "),
//     );
//   }

//   return result.data;
// }

// function validatePlannerResponse(
//   response: unknown,
// ): asserts response is Action[] {
//   try {
//     plannerResponseSchema.parse(response);
//   } catch (error) {
//     throw new LoomaError(
//       ERROR_CODES.LLM_INVALID_RESPONSE,
//       error.issues.map((i) => i.message).join(","),
//     );
//   }
// }
