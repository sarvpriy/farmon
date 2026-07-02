/**
 * Creates a history observer.
 *
 * Fires whenever the current route changes.
 *
 * @param {Object} options
 * @param {() => void} options.onRouteChange
 *
 * @returns {{
 *   start: () => void,
 *   stop: () => void
 * }}
 */
export function createHistoryObserver({ onRouteChange }) {
  let originalPushState;
  let originalReplaceState;

  function handleRouteChange() {
    onRouteChange();
  }

  return {
    start() {
      originalPushState = history.pushState;
      originalReplaceState = history.replaceState;

      history.pushState = function (...args) {
        originalPushState.apply(this, args);

        handleRouteChange();
      };

      history.replaceState = function (...args) {
        originalReplaceState.apply(this, args);

        handleRouteChange();
      };

      window.addEventListener("popstate", handleRouteChange);
    },

    stop() {
      history.pushState = originalPushState;
      history.replaceState = originalReplaceState;

      window.removeEventListener("popstate", handleRouteChange);
    },
  };
}
