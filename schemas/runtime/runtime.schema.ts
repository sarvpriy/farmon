import * as z from "zod";
import { TaskRegistry } from "../agent/action.schema.js";
import type { CommandLogger } from "../../server/logger.js";

const component = z.object({
  componentId: z.string(),
  componentName: z.string(),
  filePath: z.string(),
  cssPath: z.string(),
  importPath: z.string(),
  parentComponent: z.string().nullable(),
  childComponents: z.array(z.string()),
  exported: z.boolean(),
  props: z.array(z.unknown()),
  rootElement: z.string(),
  lastUpdated: z.string(),
});

const projectDependencies = z.object({
  dependencies: z.object(),
  devDependencies: z.object(),
  allPackages: z.object(),
});

const userCommandRequestBody = z.object({
  command: z.string(),
  componentId: z.string(),
});

const undoRequestBody = z.object({
  componentId: z.string(),
});

const redoRequestBody = z.object({
  componentId: z.string(),
});

export const componentRegistry = z.record(z.string(), component);

const appContext = z.object({
  componentRegistry,
  projectDependencies,
});
const analyaseCommandParams = z.object({
  command: z.string(),
  componentContext: component,
  projectDependencies: projectDependencies,
});

const requiredOrTypeMessage = (key: string) => (iss: any) => {
  // missing key / required
  if (iss.input === undefined) return `'${key}' is missing`;

  // type mismatch (when available)
  if (iss.code === "invalid_type") {
    return `expected '${iss.expected}', received '${typeof iss.input}'`;
  }

  // fallback
  return `Invalid ${key}`;
};

export const action = z.object({
  taskId: z.string({ error: requiredOrTypeMessage("taskId") }),
  task: z.enum(Object.keys(TaskRegistry), {
    error: requiredOrTypeMessage("task"),
  }),
  reason: z.string({ error: requiredOrTypeMessage("reason") }),
  confidence: z.number(),
  payload: z.object({}, { error: requiredOrTypeMessage("payload") }),
});

const analyaseCommandReturns = z.object({
  actions: z.array(action),
});

const operation = z.object({
  taskId: z.string(),
  task: z.string(),
  payload: z.unknown(),
  taskOutput: z.unknown(),
  target: z.unknown(),
  before: z.unknown(),
  after: z.unknown(),
});

// const snapshot = {
//   currentRoute,

//   visibleComponents,

//   selectedComponent,

//   viewport,

//   appState,

//   errors
// }

interface LoomaConfig {
  appUrl: string;
  serverPort: string;
  uiPort: string;
  componentsDirectory: string;
  llm: {
    provider: string;
    baseUrl: string;
    model: string;
  };
  componentStructure: any;
}

interface RuntimeSnapshot {}
interface RuntimeError {}

export interface AppContext {
  project: {
    root: string;
    undoPath: string;
    redoPath: string;
    trashDir: string;
    logsDir: string;
  };
  farmonRoot: string;

  componentRegistry: ComponentRegistry;

  projectDependencies: ProjectDependencies;

  config: LoomaConfig;
}

export interface ExecutionContext {
  command: string;

  request: {
    command: string;
    componentId?: string;
  };

  logger: CommandLogger;

  appContext: AppContext;

  componentContext?: ComponentContext;

  eventBus: any;

  // runtimeSnapshot?: RuntimeSnapshot;

  // runtimeError?: RuntimeError;
}

export type Action = z.infer<typeof action>;
export type Operation = z.infer<typeof operation>;
export type AnalyaseCommandParams = z.infer<typeof analyaseCommandParams>;
export type AnalyaseCommandReturns = z.infer<typeof analyaseCommandReturns>;
export type UserCommandRequestBody = z.infer<typeof userCommandRequestBody>;
export type UndoRequestBody = z.infer<typeof undoRequestBody>;
export type RedoRequestBody = z.infer<typeof redoRequestBody>;
// export type AppContext = z.infer<typeof appContext>;
export type ComponentContext = z.infer<typeof component>;

export type ComponentRegistry = z.infer<typeof componentRegistry>;
export type ProjectDependencies = z.infer<typeof projectDependencies>;
