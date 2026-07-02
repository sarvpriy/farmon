import sse from "../server/sse.js";

import {
  LOG_EVENTS,
  SSE_EVENTS,
  type EventType,
  type SSEEventType,
} from "../schemas/index.js";

// const SSE_EVENTS = new Set([
//   "HEALTH_CHANGED",
//   "SERVER_STARTED",
//   "SERVER_STOPPED",

//   "STATUS",
//   "TASK_STARTED",
//   "TASK_COMPLETED",
//   "TASK_FAILED",
//   "PLAN_GENERATED",
// ]);

// const LOG_EVENTS = new Set([
//   "USER_COMMAND",

//   "STATUS",

//   "PLAN_GENERATED",

//   "TASK_STARTED",
//   "TASK_COMPLETED",
//   "TASK_FAILED",

//   "HEALTH_CHANGED",

//   "CONFIRMATION_REQUIRED",

//   "CHECKPOINT_CREATED",
//   "CHECKPOINT_RESTORED",
// ]);

// export const eventBus = {
//   emit(type: string, payload: any = {}) {
//     const event = {
//       type,
//       timestamp: new Date().toISOString(),
//       ...payload,
//     };

//     if (Object.keys(SSE_EVENTS).includes(type)) {
//       sse.emit(type, event);
//     }

//     if (Object.keys(LOG_EVENTS).includes(type)) {
//       logger.addStep(event, payload);
//     }

//     return event;
//   },
// };

export function createEventBus(logger?) {
  return {
    emit(type: EventType, payload: any) {
      if (type !== "PLANNER_PROMPT") console.log("eventBus", type, payload);

      const event = {
        type,
        timestamp: new Date().toISOString(),
        ...payload,
      };

      if (Object.keys(SSE_EVENTS).includes(type)) {
        sse.emit(type as SSEEventType, payload);
      }

      if (Object.keys(LOG_EVENTS).includes(type)) {
        logger.addEvent(type, payload);
      }
    },
  };
}
