// hooks/useHealth.ts
import { useEffect } from "react";
import useLoomaStore from "../store/useLoomaStore.ts";
import { health } from "../services/api.ts";

const HEALTH_CHECK_INTERVAL = 10_000;

export function useHealth() {
  const setHealth = useLoomaStore((state) => state.setHealth);

  useEffect(() => {
    let cancelled = false;

    async function checkHealth() {
      try {
        const healthStatus = await health();
        //         {
        // "server": true,
        // "llm": true,
        // "llmError": null,
        // "timestamp": "2026-06-27T13:50:53.872Z"
        // }

        if (!cancelled) {
          setHealth({
            connected: true,
            ...healthStatus,
          });
        }
      } catch {
        if (!cancelled) {
          setHealth({
            server: false,
            llm: false,
            project: false,
          });
        }
      }
    }

    // Initial check
    checkHealth();

    // Poll every minute
    const interval = setInterval(checkHealth, HEALTH_CHECK_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [setHealth]);
}
