/*

If I were designing Looma, I would have:

inject.js
├── MutationObserver
├── History observer
├── Resize observer
├── Selection mode
├── Runtime snapshot store
└── Message bus


I would organize it like this:

inject.js
├── iframe manager
├── message bus
├── selection mode
├── mutation observer
├── history observer
├── resize observer
├── runtime snapshot store
└── error observer

injector is instentenious


*/

console.log("========LOOMA STARTED================");
import { INJECTOR_EVENTS } from "../schemas/runtime/injector.schema.js";

import {
  createMutationObserver,
  startMutationObserver,
} from "./observers/mutationObserver.js";
import { createResizeObserver } from "./observers/resizeObserver.js";
import { createHistoryObserver } from "./observers/historyObserver.js";
import { refreshRuntimeSnapshot } from "./store/runtimeSnapshotStore.js";
import { createErrorObserver } from "./observers/errorObserver.js";
import { setRuntimeError } from "./store/runtimeErrorStore.js";
import {
  mountIframe,
  expandIframe,
  collapseIframe,
  postMessageToLoomaPanel,
} from "./iframe/iframeManager.js";

let componentId = null;

export function inject(options = {}) {
  const config = {
    serverUrl: "http://localhost:3001",
    ...options,
  };

  // check if farmon server is running then only mount iframe
  // otherwise show floating button saying "Start farmon server"

  mountIframe(config.serverUrl);
  // addObservers()
  // addEventListeners()

  const errorObserver = createErrorObserver({
    onError(error) {
      setRuntimeError(error);

      console.error("Runtime error captured:", error);
    },
  });

  const historyObserver = createHistoryObserver({
    onRouteChange() {
      refreshRuntimeSnapshot();

      console.log("Route changed");
    },
  });

  const observer = createMutationObserver({
    onChange() {
      // runtimeSnapshotStore.refresh();
      refreshRuntimeSnapshot();
      console.log("DOM changed");
    },
  });

  const resizeObserver = createResizeObserver({
    onResize() {
      refreshRuntimeSnapshot();

      console.log("Viewport resized");
    },
  });

  historyObserver.start();
  resizeObserver.start();
  startMutationObserver(observer);
  errorObserver.start();

  window.addEventListener("message", (event) => {
    switch (event.data.type) {
      case INJECTOR_EVENTS.LOOMA_EXPAND:
        expandIframe();
        break;

      case INJECTOR_EVENTS.LOOMA_COLLAPSE:
        collapseIframe();
        break;

      case INJECTOR_EVENTS.START_COMPONENT_SELECTION:
        selector.activateSelectionMode();
        break;
    }
  });

  const selector = createComponentSelectionSystem({
    onSelect({ compId, element }) {
      console.log("Selected:", compId);
      componentId = compId;
      console.log(element);

      console.log(componentId);

      postMessageToLoomaPanel({
        type: INJECTOR_EVENTS.COMPONENT_SELECTED,
        message: componentId,
      });
      // notifySnapshotChanged();

      // addStatusLine(`Selected: ${componentId}`);
    },
  });

  function createComponentSelectionSystem({ onSelect }) {
    let isSelectionModeActive = false;

    let currentlyHoveredElement = null;

    let selectedElement = null;

    // ----------------------------------------------------------
    // HOVER OVERLAY
    // ----------------------------------------------------------

    const hoverOverlay = document.createElement("div");

    hoverOverlay.style.position = "fixed";
    hoverOverlay.style.pointerEvents = "none";
    hoverOverlay.style.zIndex = "999999";
    hoverOverlay.style.border = "2px solid #3b82f6";
    hoverOverlay.style.background = "rgba(59, 130, 246, 0.08)";
    hoverOverlay.style.display = "none";
    hoverOverlay.style.boxSizing = "border-box";

    document.body.appendChild(hoverOverlay);

    // ----------------------------------------------------------
    // SELECTED OVERLAY
    // ----------------------------------------------------------

    const selectedOverlay = document.createElement("div");

    selectedOverlay.style.position = "fixed";

    selectedOverlay.style.pointerEvents = "none";

    selectedOverlay.style.zIndex = "999998";

    selectedOverlay.style.border = "2px solid #22c55e";

    selectedOverlay.style.background = "rgba(34, 197, 94, 0.08)";

    selectedOverlay.style.display = "none";

    selectedOverlay.style.boxSizing = "border-box";

    document.body.appendChild(selectedOverlay);

    // ----------------------------------------------------------
    // UPDATE OVERLAY POSITION
    // ----------------------------------------------------------

    function updateOverlay(overlay, element) {
      const rect = element.getBoundingClientRect();

      overlay.style.display = "block";

      overlay.style.top = `${rect.top}px`;

      overlay.style.left = `${rect.left}px`;

      overlay.style.width = `${rect.width}px`;

      overlay.style.height = `${rect.height}px`;
    }

    // ----------------------------------------------------------
    // HIDE OVERLAY
    // ----------------------------------------------------------

    function hideOverlay(overlay) {
      overlay.style.display = "none";
    }

    // ----------------------------------------------------------
    // FIND COMPONENT ELEMENT
    // ----------------------------------------------------------

    function findComponentElement(target) {
      return target.closest("[data-farmon-id]");
    }

    // ----------------------------------------------------------
    // MOUSE MOVE
    // ----------------------------------------------------------

    function handleMouseMove(event) {
      if (!isSelectionModeActive) {
        return;
      }

      const componentElement = findComponentElement(event.target);

      if (!componentElement) {
        hideOverlay(hoverOverlay);
        currentlyHoveredElement = null;
        return;
      }

      if (currentlyHoveredElement === componentElement) {
        return;
      }

      currentlyHoveredElement = componentElement;

      updateOverlay(hoverOverlay, componentElement);
    }

    // ----------------------------------------------------------
    // CLICK HANDLER
    // ----------------------------------------------------------

    function handleClick(event) {
      if (!isSelectionModeActive) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const componentElement = findComponentElement(event.target);

      if (!componentElement) {
        return;
      }

      const componentId = componentElement.getAttribute("data-farmon-id");

      // --------------------------------------------------------
      // STORE SELECTED ELEMENT
      // --------------------------------------------------------

      selectedElement = componentElement;

      // --------------------------------------------------------
      // SHOW PERSISTENT OVERLAY
      // --------------------------------------------------------

      updateOverlay(selectedOverlay, componentElement);

      onSelect?.({
        compId: componentId,
        element: componentElement,
      });

      deactivateSelectionMode();
    }

    // ----------------------------------------------------------
    // ACTIVATE
    // ----------------------------------------------------------

    function activateSelectionMode() {
      if (isSelectionModeActive) {
        return;
      }

      isSelectionModeActive = true;

      document.addEventListener("mousemove", handleMouseMove, true);

      document.addEventListener("click", handleClick, true);

      document.body.style.cursor = "crosshair";
    }

    // ----------------------------------------------------------
    // DEACTIVATE
    // ----------------------------------------------------------

    function deactivateSelectionMode() {
      isSelectionModeActive = false;

      currentlyHoveredElement = null;

      hideOverlay(hoverOverlay);

      document.removeEventListener("mousemove", handleMouseMove, true);

      document.removeEventListener("click", handleClick, true);

      document.body.style.cursor = "";
    }

    // ----------------------------------------------------------
    // CLEAR SELECTED COMPONENT
    // ----------------------------------------------------------

    function clearSelection() {
      selectedElement = null;

      hideOverlay(selectedOverlay);
    }

    // ----------------------------------------------------------
    // DESTROY
    // ----------------------------------------------------------

    function destroy() {
      deactivateSelectionMode();

      hoverOverlay.remove();

      selectedOverlay.remove();
    }

    return {
      activateSelectionMode,
      deactivateSelectionMode,
      clearSelection,
      destroy,
    };
  }
}
