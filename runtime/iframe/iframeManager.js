import { INJECTOR_EVENTS } from "../../schemas/runtime/injector.schema.js";

let iframe;

const LOOMA_IFRAME_ID = "__farmon-frame";

export function mountIframe(serverUrl) {
  if (iframe) return;
  const IFRAME_URL = `${serverUrl}/ui`;

  iframe = document.createElement("iframe");

  iframe.id = LOOMA_IFRAME_ID;
  iframe.src = IFRAME_URL;

  iframe.style.position = "fixed";
  iframe.style.bottom = "16px";
  iframe.style.right = "16px";
  iframe.style.width = "98px";
  iframe.style.height = "98px";
  iframe.style.border = "none";
  iframe.style.zIndex = "2147483647";
  iframe.style.background = "transparent";

  // iframe.style.width = "10vw";
  // iframe.style.height = "10vh";
  iframe.style.background = "transparent";
  iframe.style.pointerEvents = "auto";

  document.body.appendChild(iframe);
  postMessageToLoomaPanel({
    type: INJECTOR_EVENTS.LOOMA_STARTED,
    message: "Looma starting...",
  });
}

export function expandIframe() {
  iframe.style.width = "400px";
  iframe.style.height = "100vh";
}

export function collapseIframe() {
  iframe.style.height = "98px";
  iframe.style.width = "98px";
}

export function sendMessage(message) {
  iframe.contentWindow?.postMessage(message, "*");
}

export function getIframe() {
  return iframe;
}

export function unmountIframe() {
  iframe?.remove();
  iframe = null;
}

export function postMessageToLoomaPanel({ type, message }) {
  const iframe = document.getElementById(LOOMA_IFRAME_ID);
  switch (type) {
    case INJECTOR_EVENTS.LOOMA_STARTED:
      iframe.contentWindow.postMessage(
        {
          type,
          message,
        },
        "*", // targetOrigin
      );
      break;
    case INJECTOR_EVENTS.COMPONENT_SELECTED:
      iframe.contentWindow.postMessage(
        {
          type,
          componentId: message,
        },
        "*", // targetOrigin
      );
      break;
    case INJECTOR_EVENTS.UI_SNAPSHOT:
      iframe.contentWindow.postMessage(
        {
          type,
          runtimeUiDetails: JSON.stringify(message),
        },
        "*",
      );
      break;
  }
}
