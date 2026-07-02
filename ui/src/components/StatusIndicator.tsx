import React, { useState, useEffect, useCallback, useRef } from "react";

/**
 * Live status indicator — driven by your SSE events
 * ------------------------------------------------------------------------
 * Two pieces, both exported:
 *
 *   useStatusStream()  — a hook holding { status, isActive } state, plus
 *                         a handleEvent(event) function you call from
 *                         wherever you already read your SSE events.
 *
 *   StatusIndicator    — the visual bubble (animated dots + status text
 *                         + elapsed seconds), styled to match the agent
 *                         message bubbles already in the chat panel.
 *
 * Expected event shape (adjust the `case` values in handleEvent below to
 * match whatever your server actually sends):
 *   { type: "status",  text: "Thinking" }
 *   { type: "status",  text: "Checking dependencies" }
 *   { type: "message", text: "...first chunk of the real answer..." }
 *   { type: "done" }
 *   { type: "error" }
 *
 * Wiring it into your existing SSE code:
 *
 *   const { status, isActive, handleEvent } = useStatusStream();
 *
 *   // EventSource:
 *   eventSource.onmessage = (e) => handleEvent(JSON.parse(e.data));
 *
 *   // fetch() + ReadableStream:
 *   // for each parsed "data: ..." line ->  handleEvent(JSON.parse(line));
 *
 * Then render <StatusIndicator active={isActive} status={status} /> in
 * your message list, in the same spot you'd render a "typing" bubble —
 * it returns null when inactive, so it's safe to always mount.
 * ------------------------------------------------------------------------
 */

export function useStatusStream() {
  const [status, setStatus] = useState("");
  const [isActive, setIsActive] = useState(false);

  const handleEvent = useCallback((event) => {
    if (!event) return;
    switch (event.type) {
      case "status":
        setIsActive(true);
        setStatus(event.text);
        break;
      // As soon as the real answer starts streaming (or the turn ends,
      // or errors out), drop the status bubble.
      case "message":
      case "done":
      case "error":
        setIsActive(false);
        setStatus("");
        break;
      default:
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setIsActive(false);
    setStatus("");
  }, []);

  return { status, isActive, handleEvent, reset };
}

export function StatusIndicator({ active, status }) {
  const [elapsed, setElapsed] = useState(0);

  // Elapsed-seconds counter, resets every time a fresh run starts.
  useEffect(() => {
    if (!active) {
      setElapsed(0);
      return;
    }
    const startedAt = Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [active]);

  if (!active) return null;

  return (
    <div className="flex items-start">
      <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <BouncingDots />
        <StatusText text={status} />
        {elapsed > 0 && (
          <span className="text-xs text-slate-400">· {elapsed}s</span>
        )}
      </div>
    </div>
  );
}

// Crossfades the label whenever `text` changes, instead of snapping.
function StatusText({ text }) {
  const [shown, setShown] = useState(text);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (text === shown) return;
    setVisible(false);
    const t = setTimeout(() => {
      setShown(text);
      setVisible(true);
    }, 150);
    return () => clearTimeout(t);
  }, [text, shown]);

  return (
    <span
      className={`transition-opacity duration-150 ${visible ? "opacity-100" : "opacity-0"}`}
    >
      {shown}
    </span>
  );
}

function BouncingDots() {
  return (
    <span className="flex items-center gap-1">
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500"
        style={{ animationDelay: "150ms" }}
      />
      <span
        className="h-1.5 w-1.5 animate-bounce rounded-full bg-teal-500"
        style={{ animationDelay: "300ms" }}
      />
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Demo only — lets you preview the animation without real SSE wired  */
/* up yet. Delete this part once you're calling handleEvent yourself. */
/* ------------------------------------------------------------------ */

const DEMO_EVENTS = [
  { type: "status", message: "Thinking" },
  { type: "status", message: "Reading project files" },
  { type: "status", message: "Checking dependencies" },
  { type: "status", message: "Drafting response" },
  { type: "message", message: "Here's what I found…" },
];

export default function StatusIndicatorDemo() {
  const { status, isActive, handleEvent, reset } = useStatusStream();
  const timeouts = useRef([]);

  const runDemo = () => {
    reset();
    timeouts.current.forEach(clearTimeout);
    timeouts.current = DEMO_EVENTS.map((event, i) =>
      setTimeout(() => handleEvent(event), i * 900),
    );
  };

  useEffect(() => () => timeouts.current.forEach(clearTimeout), []);

  return (
    <div className="w-96 space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <StatusIndicator active={isActive} status={status} />
      <button
        type="button"
        onClick={runDemo}
        className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 transition-colors"
      >
        Simulate SSE events
      </button>
    </div>
  );
}
