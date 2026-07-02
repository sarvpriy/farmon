/*

generateComponentCode - Generates complete component source code from a description.
generateJSX - Generates JSX markup from a description.
generateCSS - Generates CSS styles from a description.
generateComponent - Generates component logic including state, handlers, and effects.

*/
import { z } from "zod";

import { callLLM } from "../../execute/llm/call.js";
import promptMaker from "../../execute/helpers/prompt-maker.js";
import { AppContext, type LLMResponse } from "../../schemas/index.js";
import utils from "../../execute/helpers/general.js";
import parsers from "../../execute/helpers/parsers.js";
import { LoomaError } from "../../server/error.js";
import sse from "../../server/sse.js";
import validator from "../helpers/validators.js";

async function generateComponentCode({ userPrompt }, appContext: AppContext) {
  const prompt = promptMaker.buildComponentCodePrompt({ userPrompt });
  sse.emitInfo(`Calling llm...`);
  const response = await callLLM(prompt, {
    ...appContext,
    caller: "component-code-generator",
  });
  return response;
}

async function generateJSX({ userPrompt }, appContext: AppContext) {
  const prompt = promptMaker.buildGenerateJSXPrompt({ userPrompt });
  sse.emitInfo(`Calling llm...`);
  const response = await callLLM(prompt, {
    ...appContext,
    caller: "jsx-code-generator",
  });
  const parsedResponse: LLMResponse = parsers.parseLLMJsonResponse(response);
  validator.validateCodeResponse({
    response: parsedResponse,
  });

  return utils.formatObjectCode(parsedResponse);
}
async function generateCSS({ userPrompt }, appContext: AppContext) {
  const prompt = promptMaker.buildGenerateCSSPrompt({ userPrompt });
  sse.emitInfo(`Calling llm...`);
  const response = await callLLM(prompt, {
    ...appContext,
    caller: "css-code-generator",
  });
  const parsedResponse: LLMResponse = parsers.parseLLMJsonResponse(response);
  validator.validateCodeResponse({
    response: parsedResponse,
  });

  return utils.formatObjectCode(parsedResponse);
}
async function generateComponent({ userPrompt }, appContext: AppContext) {
  const prompt = promptMaker.buildGenerateComponentLogicPrompt({ userPrompt });
  sse.emitInfo(`Calling llm...`);
  const response = await callLLM(prompt, {
    ...appContext,
    caller: "component-generator",
  });
  const parsedResponse: LLMResponse = parsers.parseLLMJsonResponse(response);
  validator.validateCodeResponse({
    response: parsedResponse,
  });

  return utils.formatObjectCode(parsedResponse);
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

// async function generateProps({ userPrompt }) {
//   const prompt = buildGeneratePropsPrompt({ userPrompt });
//   const response = await invokeLLM(prompt);
//   return response;
// }
// async function generateStates({ userPrompt }) {
//   const prompt = buildGenerateStatesPrompt({ userPrompt });
//   const response = await invokeLLM(prompt);
//   return response;
// }
// async function generateHandler({ userPrompt }) {
//   const prompt = buildGenerateHandlerPrompt({ userPrompt });
//   const response = await invokeLLM(prompt);
//   return response;
// }
// async function generateResponsiveStyles({ userPrompt }) {
//   const prompt = buildGenerateResponsiveStylesPrompt({ userPrompt });
//   const response = await invokeLLM(prompt);
//   return response;
// }

export default {
  // generateDocs,
  generateComponentCode,
  generateJSX,
  generateCSS,
  generateComponent,
  //   generateProps,
  //   generateStates,
  //   generateHandler,
  //   generateResponsiveStyles,
};
