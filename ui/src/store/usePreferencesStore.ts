// stores/usePreferencesStore.ts

import { create } from "zustand";
import { persist } from "zustand/middleware";

type Preferences = {
  autoScrollLogs: boolean;
  confirmUndo: boolean;
  maxStatuses: number;

  setAutoScrollLogs: (value: boolean) => void;

  setConfirmUndo: (value: boolean) => void;

  setMaxStatuses: (value: number) => void;
};

// interface UserPreferences {
//   aiProvider: "ollama" | "openai" | "anthropic";
//   model: string;

//   theme: "system" | "light" | "dark";

//   autoApplyChanges: boolean;
//   confirmDestructiveOperations: boolean;

//   explanationLevel: "minimal" | "normal" | "detailed";

//   includeRuntimeSnapshot: boolean;
//   rememberConversation: boolean;
// }

export const usePreferencesStore = create<Preferences>()(
  persist(
    (set) => ({
      autoScrollLogs: true,
      confirmUndo: false,
      maxStatuses: 50,

      setAutoScrollLogs: (autoScrollLogs) =>
        set({
          autoScrollLogs,
        }),

      setConfirmUndo: (confirmUndo) =>
        set({
          confirmUndo,
        }),

      setMaxStatuses: (maxStatuses) =>
        set({
          maxStatuses,
        }),
    }),
    {
      name: "looma-preferences",
    }
  )
);

// how to use it
/*

const autoScrollLogs =
  usePreferencesStore(
    state => state.autoScrollLogs
  );

const setAutoScrollLogs =
  usePreferencesStore(
    state => state.setAutoScrollLogs
  );

<input
  type="checkbox"
  checked={autoScrollLogs}
  onChange={(e) =>
    setAutoScrollLogs(
      e.target.checked
    )
  }
/>

*/
