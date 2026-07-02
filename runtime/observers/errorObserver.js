/**
 * Creates an error observer.
 *
 * @param {Object} options
 * @param {(error: {
 *   type: "error" | "unhandledrejection",
 *   message: string,
 *   stack?: string
 * }) => void} options.onError
 *
 * @returns {{
 *   start: () => void,
 *   stop: () => void
 * }}
 */
export function createErrorObserver({ onError }) {
  function handleError(event) {
    onError({
      type: "error",
      message: event.message,
      stack: event.error?.stack,
    });
  }

  function handleUnhandledRejection(event) {
    onError({
      type: "unhandledrejection",
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
    });
  }

  return {
    start() {
      window.addEventListener("error", handleError);

      window.addEventListener("unhandledrejection", handleUnhandledRejection);
    },

    stop() {
      window.removeEventListener("error", handleError);

      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    },
  };
}
