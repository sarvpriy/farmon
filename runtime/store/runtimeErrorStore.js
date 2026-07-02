let latestError = null;

/**
 * Stores the latest runtime error.
 *
 * @param {{
 *   type: "error" | "unhandledrejection",
 *   message: string,
 *   stack?: string
 * }} error
 */
export function setRuntimeError(error) {
  latestError = error;
}

/**
 * Returns the latest runtime error.
 *
 * @returns {object | null}
 */
export function getRuntimeError() {
  return latestError;
}

/**
 * Clears the latest runtime error.
 */
export function clearRuntimeError() {
  latestError = null;
}
