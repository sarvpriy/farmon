import path from "path";
import { writeFile } from "fs/promises";
import { pathToFileURL } from "url";

let config;

const defaultConfig = {
  // llmUrl: "http://localhost:11434",
  appUrl: "http://localhost:5173",
  serverPort: 3001,
  uiPort: 5174,
};

export async function loadConfig({ projectRoot }) {
  if (config) {
    return config;
  }

  const resolvedPath = path.resolve(projectRoot, "farmon.config.js");

  const userConfigModule = await import(pathToFileURL(resolvedPath).href);

  config = {
    ...defaultConfig,
    ...userConfigModule.default,
  };

  return config;
}
