/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from "react";
import useLoomaStore from "@ui/store/useLoomaStore.ts";
import { SSE_EVENTS } from "@schemas/index.ts";

export function useSSE({ defaultStatus }: { defaultStatus: any }) {
  const [events, setEvents] = useState([defaultStatus]);

  const setCurrentTask = useLoomaStore((state) => state.setCurrentTask);
  const addExecutionEvent = useLoomaStore((state) => state.addExecutionEvent);
  const setHealth = useLoomaStore((state) => state.setHealth);

  useEffect(() => {
    const source = new EventSource("/events");

    console.log("Listening to sse events...");

    // Startup panel: SSE connection established.

    // Connected
    source.onopen = () => {
      setHealth({
        server: true,
        llm: true,
      });
    };

    source.onmessage = (e) => {
      // {"type":"ERROR","message":"LLM's response in invalid JSON"}
      console.log(e.data);

      const { type, message } = JSON.parse(e.data);
      const event = {
        id: crypto.randomUUID(),
        type,
        message,
        timestamp: Date.now(),
      };
      // console.log(event);
      useLoomaStore.getState().addExecutionEvent(event);

      // switch (message.type) {
      //   case SSE_EVENTS.STATUS:
      //     console.error("STATUS");
      //     addExecutionEvent(message.text);
      //     break;
      //   case SSE_EVENTS.PROGRESS:
      //     console.error("PROGRESS");
      //     addExecutionEvent(message.text);
      //     break;
      //   case SSE_EVENTS.TASK_STARTED:
      //     setCurrentTask(message.task);
      //     break;
      //   case SSE_EVENTS.TASK_COMPLETED:
      //     console.error("TASK_COMPLETED");
      //     break;
      //   case SSE_EVENTS.ERROR:
      //     console.error(message);
      //     break;
      // }

      switch (type) {
        case SSE_EVENTS.ERROR:
          console.log(message);
          break;
        case SSE_EVENTS.STATUS:
          console.log(message);
          break;
        // case SSE_EVENTS.HEALTH_CHANGED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.SERVER_STARTED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.SERVER_STOPPED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.TASK_STARTED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.TASK_COMPLETED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.PROGRESS:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.TASK_FAILED:
        //   console.log(message);
        //   break;
        // case SSE_EVENTS.PLAN_GENERATED:
        //   console.log(message);
        //   break;
      }
    };

    // Connection lost
    source.onerror = () => {
      setHealth({
        server: false,
        llm: false,
      });
    };

    return () => source.close();
  }, [addExecutionEvent, setCurrentTask, setHealth]);

  return events;
}
