import { useEffect } from "react";
import useLoomaStore from "@ui/store/useLoomaStore.ts";
import { INJECTOR_EVENTS } from "@schemas/index.ts";
/**
 *
 * It listens to messages from runtime injector
 *
 * @returns { componentId, uiSnapshot }
 */
export function useLoomaMessages() {
  // const [componentId, setComponentId] = useState("");
  // const [uiSnapshot, setUiSnapshot] = useState();

  const setComponentId = useLoomaStore((state) => state.setSelectedComponentId);
  const setUiSnapshot = useLoomaStore((state) => state.setUiSnapshot);
  const addStartupLog = useLoomaStore((state) => state.addStartupLog);

  useEffect(() => {
    function handleMessage(event) {
      // console.log("Looma recieved", event.data);
      switch (event.data.type) {
        case INJECTOR_EVENTS.LOOMA_STARTED:
          // console.log("LOOMA_STARTED", event.data.message);
          addStartupLog({
            id: crypto.randomUUID(),
            level: "success",
            text: event.data.message,
          });
          break;

        case INJECTOR_EVENTS.COMPONENT_SELECTED:
          // console.log("COMPONENT_SELECTED", event.data.componentId);
          setComponentId(event.data.componentId);
          break;

        case INJECTOR_EVENTS.UI_SNAPSHOT:
          setUiSnapshot(JSON.parse(event.data.runtimeUiDetails));
          break;
      }
    }

    window.addEventListener("message", handleMessage);

    return () => window.removeEventListener("message", handleMessage);
  }, [addStartupLog, setComponentId, setUiSnapshot]);
}
