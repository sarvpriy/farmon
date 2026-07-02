import { LoomaError } from "../server/error.js";
import { ERROR_CODES, type LLMProvider } from "../schemas/index.js";
import type { LLMResponse } from "../schemas/index.js";
export class OpenAICompatibleProvider implements LLMProvider {
  constructor(
    private config: {
      baseUrl: string;
      model: string;
      apiKey?: string;
    },
  ) {}

  async chat(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.config.apiKey
          ? {
              Authorization: `Bearer ${this.config.apiKey}`,
            }
          : {}),
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new LoomaError(
        ERROR_CODES.LLM_FAILED,
        `LLM request failed: ${response.status}`,
      );
    }

    const data = await response.json();

    return data.choices[0].message.content;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/models`, {
      headers: {
        ...(this.config.apiKey
          ? {
              Authorization: `Bearer ${this.config.apiKey}`,
            }
          : {}),
      },
    });

    if (!response.ok) {
      throw new LoomaError(
        ERROR_CODES.LLM_FAILED,
        `Failed to fetch models: ${response.status}`,
      );
    }

    const data = await response.json();

    return data.data.map((m: any) => m.id);
  }
}
