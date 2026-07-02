import { z } from "zod";
import type { LLMResponse } from "./llm.schema.js";

/*

| Category          | Example                                                     |
| ----------------- | ----------------------------------------------------------- |
| **CHAT**          | "Hello", "What can you do?"                                 |
| **PROJECT_QUERY** | "Explain this project", "Which state library are we using?" |
| **UI_QUERY**      | "Which components are visible right now?"                   |
| **CODE_QUERY**    | "Show Header component code"                                |
| **CODE_MUTATION** | "Add a footer", "Make this button red"                      |
| **DEBUG**         | "Why is build failing?"                                     |
| **RUNTIME_DEBUG** | "Why is this page blank?", "Why isn't this button visible?" |
| **EXPLAIN**       | "Explain useMemo in this component"                         |
| **REFACTOR**      | "Extract navbar into a component"                           |
| **UNDO_REDO**     | "Undo last change", "Redo"                                  |
| **PREFERENCE**    | "Always use Tailwind"                                       |


*/

type QueryCategory =
  | "CHAT"
  | "PROJECT_QUERY"
  | "UI_QUERY"
  | "CODE_QUERY"
  | "CODE_MUTATION"
  | "DEBUG"
  | "RUNTIME_DEBUG"
  | "EXPLAIN"
  | "REFACTOR"
  | "UNDO_REDO"
  | "PREFERENCE"
  | "UNKNOWN";

export interface LLMProvider {
  chat(prompt: string): Promise<string>;
  listModels(): Promise<string[]>;
}

export const instructionClassificationSchema = z.object({
  category: z.enum(["QUERY", "MUTATION"]),
});

export type InstructionClassification = z.infer<
  typeof instructionClassificationSchema
>;

export const queryAgentResponseSchema = z.union([
  z.object({
    status: z.literal("continue"),

    task: z.string(),

    reason: z.string(),

    payload: z.record(z.string(), z.any()),
  }),

  z.object({
    status: z.literal("done"),

    response: z.string(),
  }),
]);

export type QueryAgentResponse = z.infer<typeof queryAgentResponseSchema>;
