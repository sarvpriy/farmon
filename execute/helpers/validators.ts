import z from "zod";
import {
  componentResponseSchema,
  cssResponseSchema,
  jsxResponseSchema,
  LLMResponse,
  plannerResponseSchema,
} from "../../schemas/index.js";
import sse from "../../server/sse.js";

function validateCodeResponse(response: unknown) {
  try {
    z.union([
      jsxResponseSchema,
      cssResponseSchema,
      componentResponseSchema,
    ]).parse(response);
  } catch (error) {
    throw new Error(error.issues.map((i) => i.message).join(","));
  }
  // const schema = z.object({
  //   thought: z.string(),
  //   updatedCode: z.string(),
  // });

  // schema.parse(response);
}

function validateResponse({
  response,
  // caller,
}: {
  response: unknown;
  // caller: "planner" | "jsx" | "css" | "component";
}) {
  sse.emitInfo("Validating LLM Response...");
  // const schemaByCaller = {
  //   planner: plannerResponseSchema,
  //   jsx: jsxResponseSchema,
  //   css: cssResponseSchema,
  //   component: componentResponseSchema,
  // } as const;

  // const schema = schemaByCaller[caller];

  const result = plannerResponseSchema.safeParse(response);
  if (!result.success) {
    // do not add LoomaError here as it will be included in retry prompt
    throw new Error(result.error.issues.map((i) => i.message).join(", "));
  }

  return result.data;
}

export default { validateCodeResponse, validateResponse };
