import { ERROR_CODES } from "../schemas/index.js";
import { OllamaProvider } from "./ollama.js";
import { OpenAICompatibleProvider } from "./openai-compatible.js";
import { LoomaError } from "../server/error.js";

export function getProvider(config: any) {
  switch (config.provider) {
    case "ollama":
      return new OllamaProvider(config);

    case "openai-compatible":
      return new OpenAICompatibleProvider(config);

    default:
      throw new LoomaError(
        ERROR_CODES.UNSUPPORTED_PROVIDER,
        `Unsupported provider: ${config.provider}`,
      );
  }
}
