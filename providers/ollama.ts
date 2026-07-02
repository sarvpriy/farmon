import { LoomaError } from "../server/error.js";
import { ERROR_CODES, type LLMProvider } from "../schemas/index.js";
import type { LLMResponse } from "../schemas/index.js";

export class OllamaProvider implements LLMProvider {
  constructor(
    private config: {
      baseUrl: string;
      model: string;
    },
  ) {}

  async chat(prompt: string): Promise<string> {
    const response = await fetch(`${this.config.baseUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new LoomaError(
        ERROR_CODES.LLM_FAILED,
        `Ollama request failed: ${response.status}`,
      );
    }

    const data = await response.json();

    return data.message.content;
  }

  async listModels(): Promise<string[]> {
    const response = await fetch(`${this.config.baseUrl}/api/tags`);

    if (!response.ok) {
      throw new LoomaError(
        ERROR_CODES.LLM_FAILED,
        `Failed to fetch models: ${response.status}`,
      );
    }

    const data = await response.json();

    return data.models.map((m: any) => m.name);
  }
}
