import promptMaker from "../../execute/helpers/prompt-maker.js";
import { callLLM } from "../../execute/llm/call.js";
import {
  EVENTS,
  ExecutionContext,
  instructionClassificationSchema,
} from "../../schemas/index.js";
import sse from "../../server/sse.js";

export default async function classifyInstruction(
  command: string,
  ctx: ExecutionContext,
) {
  sse.emitInfo("Understanding your request...");

  const prompt = promptMaker.buildInstructionClassifierPrompt(command);

  sse.emitInfo(`Calling llm...`);
  ctx.eventBus.emit(EVENTS.INSTRUCTION_AGENT_PROMPT, { prompt });

  const response = await callLLM(prompt, {
    ...ctx.appContext,
    caller: "instruction-classifier-agent",
  });

  const parsed = JSON.parse(response);
  ctx.eventBus.emit(EVENTS.INSTRUCTION_AGENT_RESPONSE, { response: parsed });

  return instructionClassificationSchema.parse(parsed);
}
