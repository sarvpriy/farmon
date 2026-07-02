import express from "express";
import path from "path";
import cors from "cors";
// import { parseArgs } from "node:util";
// import { createProxyMiddleware } from "http-proxy-middleware";

import "module-alias/register";

import history from "../execute/history/history-manager.js";
import execute from "../execute/index.js";
import sse from "../server/sse.js";
// import utils from "../execute/helpers/general.js";

import {
  type ComponentRegistry,
  type ProjectDependencies,
  type UserCommandRequestBody,
  type AppContext,
  type ExecutionContext,
  EVENTS,
} from "../schemas/index.js";

import { createServer as createViteServer } from "vite";

import { loadConfig } from "./config.js";
import { CommandLogger, saveCommandLog } from "./logger.js";
import { callLLM } from "../execute/llm/call.js";
import { createEventBus } from "./event-bus.js";
import { createAppContext } from "./app-context.js";

// -----------------------------------------------------
// Create Express application.
// -----------------------------------------------------

const app = express();

// -----------------------------------------------------
// Global middlewares.
// -----------------------------------------------------

app.use(express.json());
app.use(cors());

// // npm run dev --project ./playground/react-vite
// console.log(process.argv);

// const {
//   values: { project: projectPath },
// } = parseArgs({
//   args: process.argv.slice(2),
//   options: {
//     project: {
//       type: "string",
//       short: "p",
//     },
//   },
// });

// // const projectPath = process.argv

// console.log(projectPath);

// // await loadConfig(projectPath);
// const config = await loadConfig(projectPath);
// // console.log(process.cwd());
// console.log(config);

// const SERVER_PORT = config.serverPort ?? 3001;
// // const UI_PORT = config.uiPort ?? 5178;

// // -----------------------------------------------------
// // Build project-level caches once during server startup.
// // -----------------------------------------------------

// const componentRegistry: ComponentRegistry = utils.createComponentRegistry({
//   componentsPath: path.join(PROJECT_ROOT, config.componentsDirectory),
// });

// const projectDependencies: ProjectDependencies = utils.getProjectDependencies({
//   projectRoot: PROJECT_ROOT,
// });

// const appContext: AppContext = {
//   componentRegistry,
//   projectDependencies,
//   config,
//   // historyManager,
//   // logger,
//   // eventBus,
//   // planner,
// };

const args = process.argv.slice(2);

let projectRoot = process.cwd();

const projectIndex = args.indexOf("--project");

if (projectIndex !== -1) {
  projectRoot = path.resolve(args[projectIndex + 1]);
}

const appContext: AppContext = await createAppContext({ projectRoot });

// console.log("App context...", appContext);

const uiRoot = path.join(appContext.loomaRoot, "ui");

if (process.env.NODE_ENV === "development") {
  const vite = await createViteServer({
    root: uiRoot,
    server: {
      middlewareMode: true,
    },
    appType: "spa",
  });

  app.use("/ui", vite.middlewares);
} else {
  app.use("/ui", express.static(uiRoot));

  app.get("/ui", (req, res) => {
    res.sendFile(path.join(uiRoot, "index.html"));
  });
}

// -----------------------------------------------------
// Main endpoint.
// -----------------------------------------------------

app.post("/chat", async (req, res) => {
  // ----------------------------------------------------------
  // STEP 1:
  // Extract the user's command and selected component.
  // ----------------------------------------------------------

  const { command, componentId }: UserCommandRequestBody = req.body;

  // ----------------------------------------------------------
  // STEP 3:
  // Create a logger and event bus for this execution.
  // Every significant event during the command execution will
  // be recorded through the event bus.
  // ----------------------------------------------------------

  const logger = new CommandLogger({ type: "COMMAND", command });

  const eventBus = createEventBus(logger);

  eventBus.emit(EVENTS.COMMAND_RECEIVED, { ...req.body });

  // ----------------------------------------------------------
  // STEP 4:
  // Create the execution context shared across all agents,
  // planners and deterministic tasks.
  // ----------------------------------------------------------

  const executionContext: ExecutionContext = {
    command,
    request: req.body,
    logger,
    eventBus,
    appContext,
    // componentContext,
  };

  try {
    // ----------------------------------------------------------
    // STEP 5:
    // Analyse the user's instruction.
    //
    // Depending on the instruction this may:
    // - answer a project question
    // - generate an execution plan
    // - execute deterministic tasks
    // - return a conversational response
    // ----------------------------------------------------------

    const result = await execute.request(executionContext);

    // ----------------------------------------------------------
    // STEP 6:
    // Mark the command as successfully completed.
    // ----------------------------------------------------------

    eventBus.emit(EVENTS.COMMAND_COMPLETED, { result });

    return res.status(200).send({
      success: true,
      command,
      message: result,
    });
  } catch (error) {
    // ----------------------------------------------------------
    // STEP 7:
    // Record the failure and return a friendly error message.
    // ----------------------------------------------------------

    eventBus.emit(EVENTS.ERROR, { message: error.message });
    sse.emitInfo("Unable to complete the request");
    return res.status(200).send({
      success: false,
      message:
        error.message ?? "Something went wrong on our end. Please try again.",
    });
  } finally {
    // ----------------------------------------------------------
    // STEP 8:
    // Persist the execution log regardless of success or failure.
    // ----------------------------------------------------------

    await saveCommandLog(logger.getLog(), appContext.project.logsDir);
    sse.emitInfo("Done...");
  }
});

// -----------------------------------------------------
// Undo last action.
// -----------------------------------------------------

app.post("/undo", async (req, res) => {
  try {
    const result = await history.undo({
      appContext,
    });

    return res.status(200).send(result);
  } catch (error) {
    console.error(error);

    return res.status(200).send({
      success: false,
      message: error.message,
    });
  }
});

// -----------------------------------------------------
// Redo previously undone action.
// -----------------------------------------------------

app.post("/redo", async (req, res) => {
  try {
    const result = await history.redo({
      appContext,
    });

    return res.status(200).send(result);
  } catch (error) {
    console.error(error);

    return res.status(200).send({
      success: false,
      message: error.message,
    });
  }
});

// -----------------------------------------------------
// Make SSE connection for real time updates
// -----------------------------------------------------

app.get("/events", (req, res) => {
  // Tell browser we're sending an event stream
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  // Flush headers immediately
  res.flushHeaders();

  // Register this client
  sse.clients.push(res);

  console.log("Client connected");

  // Remove client when disconnected
  req.on("close", () => {
    const index = sse.clients.indexOf(res);

    if (index !== -1) {
      sse.clients.splice(index, 1);
    }

    console.log("Client disconnected");
  });
});

// -----------------------------------------------------
// Get configs
// -----------------------------------------------------

app.get("/config", async (req, res) => {
  if (appContext.config) {
    return res.status(200).send({
      success: true,
      message: appContext.config,
    });
  } else {
    return res.status(200).send({
      success: false,
      message: "Configuration not found",
    });
  }
});

// -----------------------------------------------------
// Health
// -----------------------------------------------------

app.get("/health", async (req, res) => {
  let llm = false;
  let llmError = null;

  try {
    await callLLM("Say OK", { ...appContext, caller: "health" });
    llm = true;
  } catch (error) {
    llmError = error.message;
  }

  res.json({
    server: true,
    llm,
    llmError,
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------
// Start server.
// -----------------------------------------------------

app.listen(appContext.config.serverPort, () => {
  console.log(
    `Farmon server running on http://localhost:${appContext.config.serverPort}`,
  );
});
