/** @type {import("farmon").FarmonConfig} */
export default {
  // backend
  llm: {
    provider: "openai-compatible", // "openai-compatible" | "ollama"
    baseUrl: "http://localhost:1234/v1", // "http://localhost:1234/v1"
    model: "qwen3.5-9b", //"qwen3:8b",
  },
  // llm: {
  //   provider: "ollama", // "openai-compatible" | "ollama"
  //   baseUrl: "http://localhost:11434", // "http://localhost:1234/v1"
  //   model: "llama3:latest", //"qwen3:8b",
  // },
  // llmApi: "http://localhost:11434/api/generate",
  // // llmUrl: "http://localhost:11434",
  // // llmCallApi: "/api/generate",
  // llmModel: "gpt-3.5-turbo",
  appUrl: "http://localhost:5173", // user's app url
  serverPort: 3001, // farmon server will run on this port
  uiPort: 5174, // farmon iframe will run on this port

  screenshot: {
    enabled: true,
  },
  componentsDirectory: "src",

  componentStructure: [".jsx", ".css", "index.ts"],

  componentIdAttribute: "data-component-id", // this is for component selection system
  selection: {
    hoverColor: "#3b82f6",
  },
};
