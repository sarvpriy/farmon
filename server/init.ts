import fs from "node:fs";
import path from "node:path";

export async function initProject({ yes }: { yes: boolean }) {
  const projectRoot = process.cwd();

  const packageJson = path.join(projectRoot, "package.json");

  if (!fs.existsSync(packageJson)) {
    console.error(
      "❌ package.json not found.\nRun this command inside your project.",
    );
    process.exit(1);
  }

  const configPath = path.join(projectRoot, "farmon.config.js");

  if (!fs.existsSync(configPath)) {
    const config = yes ? createDefaultConfig() : await askQuestions();

    fs.writeFileSync(configPath, config);
    console.log("✓ Created farmon.config.js");
  } else {
    console.log("✓ farmon.config.js already exists");
  }

  const farmonDir = path.join(projectRoot, ".farmon");

  if (!fs.existsSync(farmonDir)) {
    fs.mkdirSync(farmonDir);
    ["logs", "trash", "history"].forEach((dir) =>
      fs.mkdirSync(path.join(farmonDir, dir), { recursive: true }),
    );

    ["undo.json", "redo.json"].forEach((file) =>
      fs.writeFileSync(path.join(farmonDir, "history", file), "[]", "utf8"),
    );
    console.log("✓ Created .farmon/");
  }

  // later add cache, snapshots, or checkpoints

  const gitignorePath = path.join(projectRoot, ".gitignore");

  const entry = ".farmon";

  if (!fs.existsSync(gitignorePath)) {
    fs.writeFileSync(gitignorePath, `${entry}\n`);

    console.log("✓ Created .gitignore");
  } else {
    const content = fs.readFileSync(gitignorePath, "utf8");

    if (
      !content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .includes(entry)
    ) {
      fs.appendFileSync(gitignorePath, `\n${entry}\n`);

      console.log("✓ Updated .gitignore");
    }
  }

  printInstructions();
}

function createDefaultConfig() {
  return `const config = {
  llm: {
    provider: "openai-compatible", // "openai-compatible" | "ollama"
    baseUrl: "http://localhost:1234/v1", // <api-url>
    model: "qwen3.5-9b", // <model-name>
  },
  appUrl: "http://localhost:5173", // user's app url
  serverPort: 3001, // farmon server will run on this port
  uiPort: 5174, // farmon chat box will run on this port

  componentsDirectory: "src", // your component's directory

  componentStructure: [".jsx", ".css", "index.ts"], // your project's component tructure

  componentIdAttribute: "data-farmon-id", // this is for component selection system
  selection: {
    hoverColor: "#3b82f6",
  },
};

export default config;
`;
}

async function askQuestions() {
  // later use @inquirer/prompts

  return createDefaultConfig();
}

function printInstructions() {
  console.log(`
────────────────────────────────────────

✅ Farmon initialized successfully.


Next steps:

1. Add the Vite plugin

import { farmonVitePlugin } from "farmon/vite";

export default defineConfig({
  plugins: [farmonVitePlugin(), react()], // make sure to add farmonVitePlugin before react
});


2. Initialize Farmon

import { init } from "farmon";

init({
  serverUrl: "http://localhost:3001",
});


3. Start Farmon

farmon start
or 
npx farmon start

────────────────────────────────────────
`);
}
