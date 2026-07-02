import React, { useRef, useEffect, useState } from "react";
import { BsSend } from "react-icons/bs";
import { FaUndo } from "react-icons/fa";
import { FaRedo } from "react-icons/fa";
import { AiOutlineSelect } from "react-icons/ai";
import { useLoomaActions } from "../hooks/useLoomaActions.ts";
import useLoomaStore from "../store/useLoomaStore.ts";
import StartupStatus from "./StartupStatus.tsx";

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

function formatChatTimestamp(timestamp) {
  const date = new Date(timestamp);
  const now = new Date();

  // Calculate differences
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  const diffInMinutes = Math.floor(diffInSeconds / 60);

  // 1. "Just now" for less than a minute
  if (diffInSeconds < 60) {
    return "Just now";
  }

  // 2. "Xm ago" for less than an hour
  if (diffInMinutes < 60) {
    return `${diffInMinutes}m ago`;
  }

  // Check if it's today, yesterday, etc.
  const isToday = date.toDateString() === now.toDateString();

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  // Time formatting options (e.g., "4:15 PM")
  const timeOptions = {
    hour: "numeric" as const,
    minute: "2-digit" as const,
    hour12: true,
  };
  const timeString = date.toLocaleTimeString(undefined, timeOptions);

  // 3. "Today at 4:15 PM"
  if (isToday) {
    return `Today at ${timeString}`;
  }

  // 4. "Yesterday at 4:15 PM"
  if (isYesterday) {
    return `Yesterday at ${timeString}`;
  }

  // 5. Older messages: "MM/DD/YYYY" or "Jun 23, 2026"
  const dateOptions = {
    month: "short" as const,
    day: "numeric" as const,
    year: "numeric" as const,
  };
  return `${date.toLocaleDateString(undefined, dateOptions)}`;
}

/* ------------------------------------------------------------------ */
/* Chat tab                                                            */
/* ------------------------------------------------------------------ */

export default function Chat() {
  const { handleSubmit, handleUndo, handleRedo, handleSelectComponent } =
    useLoomaActions();

  const command = useLoomaStore((state) => state.command);
  const setCommand = useLoomaStore((state) => state.setCommand);
  const messages = useLoomaStore((state) => state.messages);

  const scrollRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Runs whenever the message list changes — whether the new message
  // came from the user submitting, or an agent/support message arriving
  // — and whenever the typing indicator toggles. scrollIntoView is more
  // reliable than setting scrollTop directly because it re-measures
  // after the new bubble has actually been laid out.
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  }, [messages]);

  //   useEffect(() => {
  //     if (scrollRef.current) {
  //       scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  //     }
  //   }, [messages]);

  // Every keystroke pushes the previous draft onto the undo stack and
  // clears the redo stack, like a typical text-editor undo model.
  const changeDraft = (e) => {
    e.preventDefault();
    // setUndoStack((prev) => [...prev, draft]);
    // setRedoStack([]);
    // setDraft(value);
    setCommand(e.target.value);
  };

  const selectedComponentId = useLoomaStore(
    (state) => state.selectedComponentId,
  );
  const isProcessing = useLoomaStore((state) => state.isProcessing);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* History */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-3 overflow-y-auto bg-slate-50 px-4 py-6"
      >
        <StartupStatus />
        {messages.map((msg) =>
          msg.sender === "system" ? (
            <div key={msg.id} className="flex justify-start">
              <span className="px-3 py-1 text-xs text-slate-500">
                {msg.text}
              </span>
            </div>
          ) : (
            <div
              key={msg.id}
              className={cx(
                "flex flex-col",
                msg.sender === "user" ? "items-end" : "items-start",
              )}
            >
              <div
                style={{ maxWidth: "80%" }}
                className={cx(
                  "rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  msg.sender === "user"
                    ? "rounded-br-sm bg-teal-600 text-white"
                    : "rounded-bl-sm border border-slate-200 bg-white text-slate-700",
                )}
              >
                {msg.text}
              </div>
              <span className="mt-1 px-1 text-xs text-slate-400">
                {formatChatTimestamp(msg.timestamp)}
              </span>
            </div>
          ),
        )}
        {isProcessing && <StatusIndicator />}

        {/* {isAgentTyping && (
            <div className="flex flex-col items-start">
              <div className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-400">
                Support is typing…
              </div>
            </div>
          )} */}

        {/* Empty anchor element — scrollIntoView targets this so the
              list always lands exactly at the newest content. */}
        <div ref={messagesEndRef} />
      </div>

      {/* Chatting panel */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
        className="space-y-2 border-t border-slate-200 bg-white p-2 relative"
      >
        <p className="text-xs ml-3 absolute -top-6">
          Selected: {selectedComponentId}
        </p>
        {/* Select */}
        {/* <select
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full rounded-lg border border-slate-300 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-700 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          >
            {TOPIC_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select> */}

        {/* Message input + submit */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSelectComponent}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <AiOutlineSelect />
          </button>
          <input
            type="text"
            id="user-command"
            name="user-command"
            value={command}
            onChange={changeDraft}
            placeholder="Type your command..."
            className="flex-1 rounded-lg border border-slate-300 px-2 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-100"
          />
          <button
            type="submit"
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <BsSend />
          </button>
          {/* Undo / Redo */}
          {/* <div className="flex gap-2"> */}
          <button
            type="button"
            onClick={handleUndo}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <FaUndo />
          </button>
          <button
            type="button"
            onClick={handleRedo}
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
          >
            <FaRedo />
          </button>
          {/* </div> */}
        </div>
      </form>
    </div>
  );
}

// function ExecutionEvents() {
//   const executionEvents = useLoomaStore((state) => state.executionEvents);
//   return <p>Events {executionEvents.length}</p>;
// }

function StatusIndicator() {
  const [elapsed] = useState(0);
  const executionEvents = useLoomaStore((state) => state.executionEvents);

  const status = executionEvents.at(-1)?.message || "";

  // Elapsed-seconds counter, resets every time a fresh run starts.
  // useEffect(() => {
  //   if (!active) {
  //     setElapsed(0);
  //     return;
  //   }
  //   const startedAt = Date.now();
  //   const interval = setInterval(() => {
  //     setElapsed(Math.floor((Date.now() - startedAt) / 1000));
  //   }, 1000);
  //   return () => clearInterval(interval);
  // }, [active]);

  // if (!active) return null;
  const EMOJI = {
    check: "✓",
    loading: "◌",
  };

  return (
    <div className="flex items-start">
      {/* <div className="flex items-center gap-2 rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500">
        <BouncingDots />
        <StatusText text={status} />
        {elapsed > 0 && (
          <span className="text-xs text-slate-400">· {elapsed}s</span>
        )}
      </div> */}
      {/* New rows fade/slide in on mount. Existing rows keep their DOM
          node (same key), so they never replay this — only freshly
          pushed events do. */}
      <style>{`
        @keyframes status-line-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .status-line {
          animation: status-line-in 220ms ease-out;
        }
      `}</style>

      <div
        style={{ maxWidth: "85%" }}
        className="rounded-2xl rounded-bl-sm border border-slate-200 bg-white px-3 py-2.5"
      >
        <ul className="space-y-1.5">
          {executionEvents.map((event) => {
            const isLoading = event.message === "loading";
            return (
              <li
                key={event.id}
                className="status-line flex items-center gap-2 text-xs"
              >
                <span
                  className={
                    isLoading
                      ? "inline-block animate-spin text-slate-400"
                      : "text-teal-600"
                  }
                >
                  {isLoading ? EMOJI.loading : EMOJI.check}
                </span>
                <span
                  className={
                    isLoading ? "font-medium text-slate-700" : "text-slate-400"
                  }
                >
                  {event.message}
                </span>
              </li>
            );
          })}
        </ul>
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

    // Move your state updates into the asynchronous timer block
    const t = setTimeout(() => {
      setVisible(false); // Hide the old text
      setShown(text); // Update to the new text
      setVisible(true); // Fade back in
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
