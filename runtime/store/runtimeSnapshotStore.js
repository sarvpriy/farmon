import { createRuntimeSnapshot } from "../snapshot/createRuntimeSnapshot.js";

let snapshot = createRuntimeSnapshot();

/**
 * Rebuilds the runtime snapshot.
 */
export function refreshRuntimeSnapshot() {
  snapshot = createRuntimeSnapshot();
  console.log("refreshRuntimeSnapshot");

  // here push the data
  // this is flooding the console
  // postMessageToLoomaPanel({ type: "UI_SNAPSHOT", message: snapshot });
}

/**
 * Returns the current snapshot.
 *
 * @returns {ReturnType<typeof createRuntimeSnapshot>}
 */
export function getRuntimeSnapshot() {
  return snapshot;
}

// example snapshot
/*

{
  currentRoute: "/dashboard",

  visibleComponents: [
    {
      id: "cmp_42",

      bounds: {
        x: 0,
        y: 0,
        width: 280,
        height: 900
      },

      visible: true
    },

    {
      id: "cmp_43",

      bounds: {
        x: 280,
        y: 0,
        width: 1160,
        height: 900
      },

      visible: true
    }
  ],

  viewport: {
    width: 1440,
    height: 900
  }
}

*/
