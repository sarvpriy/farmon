import promptMaker from "../../execute/helpers/prompt-maker.js";
import { callLLM } from "../../execute/llm/call.js";
import { instructionClassificationSchema } from "../../schemas/index.js";
import sse from "../../server/sse.js";

export default async function classifyInstruction(command: string, ctx) {
  sse.emitInfo("Understanding your request...");

  const prompt = promptMaker.buildInstructionClassifierPrompt(command);

  sse.emitInfo(`Calling llm...`);

  const response = await callLLM(prompt, {
    ...ctx,
    caller: "instruction-classifier-agent",
  });

  const parsed = JSON.parse(response);

  return instructionClassificationSchema.parse(parsed);
}
