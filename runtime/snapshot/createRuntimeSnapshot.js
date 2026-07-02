/**
 * Creates a runtime snapshot of the application.
 *
 * @returns {{
 *   currentRoute: string,
 *   visibleComponents: {
 *     id: string,
 *     bounds: DOMRect,
 *     visible: boolean
 *   }[],
 *   viewport: {
 *     width: number,
 *     height: number
 *   }
 * }}
 */
export function createRuntimeSnapshot() {
  const visibleComponents = [];

  document.querySelectorAll("[data-component-id]").forEach((element) => {
    const rect = element.getBoundingClientRect();

    visibleComponents.push({
      id: element.dataset.componentId,
      bounds: rect,
      visible: rect.width > 0 && rect.height > 0,
    });
  });

  return {
    currentRoute:
      window.location.pathname + window.location.search + window.location.hash,

    visibleComponents,

    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
    },
  };
}
