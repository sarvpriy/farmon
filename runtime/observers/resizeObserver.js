/**
 * Creates a viewport resize observer.
 *
 * @param {Object} options
 * @param {() => void} options.onResize
 *
 * @returns {{
 *   start: () => void,
 *   stop: () => void
 * }}
 */
export function createResizeObserver({ onResize }) {
  let timeoutId;

  function handleResize() {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      onResize();
    }, 100);
  }

  return {
    start() {
      window.addEventListener("resize", handleResize);
    },

    stop() {
      window.removeEventListener("resize", handleResize);
    },
  };
}
