/* eslint-disable @typescript-eslint/no-explicit-any */
import { create } from "zustand";
import { devtools } from "zustand/middleware";

import type { SSEEventType } from "@/schemas/index.ts";

// type TaskProgress = {
//   taskId: string;

//   category: "mutation" | "ast" | "generator";

//   task: string;

//   status: "pending" | "running" | "completed" | "failed";

//   startedAt?: number;

//   completedAt?: number;

//   durationMs?: number;

//   message?: string;

//   error?: string;
// };

type VisibleComponent = {
  id: string;

  name: string;

  visible: boolean;

  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
};

type SelectedComponent = {
  id: string;

  name?: string;
};

type RuntimeUiSnapshot = {
  currentRoute: string;

  visibleComponents: VisibleComponent[];

  selectedComponent?: SelectedComponent;

  appState: Record<string, any>;

  viewport: {
    width: number;
    height: number;
  };
};

export interface HealthStatus {
  server: boolean;
  llm: boolean;
  project: boolean;
}

export interface StartupLog {
  id: string;
  text: string;
  level: "info" | "success" | "warning" | "error";
}

export interface ChatMessage {
  id: string;
  sender: "user" | "agent" | "system";
  text: string;
  timestamp: number;
}

export interface ExecutionEvent {
  id: string;
  type: SSEEventType;

  message: string;

  timestamp: number;
}

export interface LoomaState {
  // --------------------------------------------------
  // Connection
  // --------------------------------------------------

  health: HealthStatus;

  startupLogs: StartupLog[];

  // --------------------------------------------------
  // Chat
  // --------------------------------------------------

  messages: ChatMessage[];

  // --------------------------------------------------
  // Current execution
  // --------------------------------------------------

  currentTask: string | null;

  executionEvents: ExecutionEvent[];

  isProcessing: boolean;

  // --------------------------------------------------
  // Runtime
  // --------------------------------------------------

  uiSnapshot: RuntimeUiSnapshot | null;

  selectedComponentId: string | null;

  // --------------------------------------------------
  // User input
  // --------------------------------------------------

  command: string;

  // --------------------------------------------------
  // Preferences
  // --------------------------------------------------

  preferences: {
    autoScrollLogs: boolean;
    showRuntimeEvents: boolean;
    theme: "light" | "dark";
  };

  // --------------------------------------------------
  // Actions
  // --------------------------------------------------

  setHealth: (health: Partial<HealthStatus>) => void;

  addStartupLog: (log: StartupLog) => void;

  addMessage: (message: ChatMessage) => void;

  setCurrentTask: (task: string | null) => void;

  addExecutionEvent: (event: ExecutionEvent) => void;

  clearExecutionEvents: () => void;

  setIsProcessing: (isProcessing: boolean) => void;

  setUiSnapshot: (snapshot: RuntimeUiSnapshot | null) => void;

  setSelectedComponentId: (componentId: string | null) => void;

  setCommand: (command: string) => void;
}

// 1. Define your store and actions
const useLoomaStore = create(
  devtools<LoomaState>((set) => ({
    health: {
      server: false,
      llm: false,
      project: false,
    },

    startupLogs: [],

    messages: [],

    currentTask: null,

    executionEvents: [],

    isProcessing: false,

    uiSnapshot: null,

    selectedComponentId: null,

    command: "",

    preferences: {
      autoScrollLogs: true,
      showRuntimeEvents: true,
      theme: "dark",
    },

    setHealth: (health) =>
      set((state) => ({
        health: {
          ...state.health,
          ...health,
        },
      })),

    addStartupLog: (log) =>
      set((state) => ({
        startupLogs: [...state.startupLogs, log],
      })),

    addMessage: (message) =>
      set((state) => ({
        messages: [...state.messages, message],
      })),

    setCurrentTask: (task) =>
      set({
        currentTask: task,
        isProcessing: !!task,
      }),

    addExecutionEvent: (event) =>
      set((state) => ({
        executionEvents: [...state.executionEvents, event],
      })),

    clearExecutionEvents: () =>
      set({
        executionEvents: [],
      }),

    setUiSnapshot: (snapshot) =>
      set({
        uiSnapshot: snapshot,
      }),

    setSelectedComponentId: (componentId) =>
      set({
        selectedComponentId: componentId,
      }),

    setCommand: (command) =>
      set({
        command,
      }),

    setIsProcessing: (isProcessing) =>
      set({
        isProcessing,
      }),
  })),
);

export default useLoomaStore;
