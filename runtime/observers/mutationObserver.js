/**
 * Creates a MutationObserver that listens for DOM changes.
 *
 * @param {Object} options
 * @param {(mutations: MutationRecord[]) => void} options.onChange
 *
 * @returns {MutationObserver}
 */
export function createMutationObserver({ onChange }) {
  let timeoutId = null;

  return new MutationObserver(() => {
    clearTimeout(timeoutId);

    timeoutId = setTimeout(() => {
      onChange();
    }, 100);
  });
}

/**
 * Start observing DOM changes.
 *
 * @param {MutationObserver} observer
 */
export function startMutationObserver(observer) {
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
  });
}

/**
 * Stops observing DOM changes.
 *
 * @param {MutationObserver} observer
 */
export function stopMutationObserver(observer) {
  observer.disconnect();
}
