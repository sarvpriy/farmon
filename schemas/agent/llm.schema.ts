import { z } from "zod";
import { action, type Action } from "../runtime/runtime.schema.js";

export const jsxResponseSchema = z.object({
  type: z.enum(["jsx", "css"]),
  code: z.string(),
});

export const cssResponseSchema = z.object({
  type: z.enum(["jsx", "css"]),
  code: z.string(),
});

export const componentResponseSchema = z.object({
  component: z.string(),
  css: z.string(),
});

export const plannerResponseSchema = z.array(action);

export type LLMResponse =
  | Action[]
  | JSXResponse
  | CSSResponse
  | ComponentResponse;

export type JSXResponse = z.infer<typeof jsxResponseSchema>;
export type CSSResponse = z.infer<typeof cssResponseSchema>;
export type ComponentResponse = z.infer<typeof componentResponseSchema>;
