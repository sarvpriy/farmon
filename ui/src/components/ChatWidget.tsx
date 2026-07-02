import React, { useState } from "react";
import { CgSupport } from "react-icons/cg";
import { IoClose } from "react-icons/io5";
// import { BsSend } from "react-icons/bs";
// import { FaUndo } from "react-icons/fa";
// import { FaRedo } from "react-icons/fa";
// import { AiOutlineSelect } from "react-icons/ai";
// import { useLoomaActions } from "../hooks/useLoomaActions.ts";
// import useLoomaStore from "../store/useLoomaStore.ts";

import Guidelines from "./Guidelines.tsx";
import Settings from "./Settings.tsx";
import Chat from "./Chat.tsx";
import { INJECTOR_EVENTS } from "@schemas/index.ts";
import useLoomaStore from "../store/useLoomaStore.ts";

/**
 * Floating Support Chat Widget
 * ------------------------------------------------------------------------
 * Self-contained: renders its own floating trigger button + the chat
 * panel, so you can drop <SupportChatWidget /> once in your layout.
 *
 * If you already have your own floating button, just lift `isOpen` out
 * of this file (turn it into a prop) and call it from your own button's
 * onClick instead of the one rendered below.
 *
 * Icons: every spot an icon would normally go uses a plain text label
 * instead (per request) — swap in your own icon library wherever you
 * see a comment marking it.
 * ------------------------------------------------------------------------
 */

// const TOPIC_OPTIONS = [
//   "General question",
//   "Billing & payments",
//   "Technical issue",
//   "Feature request",
// ];

const TABS = [
  { key: "chat", label: "Chat" },
  { key: "settings", label: "Settings" },
  { key: "guidelines", label: "Guidelines" },
];

function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export default function ChatBox() {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("chat");

  const handleButtonClick = () => {
    window.parent.postMessage(
      {
        type: isOpen
          ? INJECTOR_EVENTS.LOOMA_COLLAPSE
          : INJECTOR_EVENTS.LOOMA_EXPAND,
      },
      "*",
    );
    setIsOpen(!isOpen);
  };

  return (
    <div>
      {/* Floating trigger button — swap for your own if you already have one */}
      {/* {!isOpen && ( */}
      <button
        type="button"
        onClick={handleButtonClick}
        aria-label="Open support chat"
        className="fixed bottom-4 right-1 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-teal-600 text-white shadow-xl hover:bg-teal-700 transition-colors focus:outline-none focus:ring-4 focus:ring-teal-200"
      >
        <span className="text-sm font-semibold">
          {isOpen ? <IoClose /> : <CgSupport />}
        </span>
      </button>
      {/* )} */}

      {/* Chat panel */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-1 z-50 flex w-99 flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
          style={{ height: "600px", maxHeight: "85vh" }}
        >
          <Header onClose={() => setIsOpen(false)} />
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-200">
            {/* <div className="flex items-center gap-2"> */}
            {/* <div> */}
            <Tabs activeTab={activeTab} onChange={setActiveTab} />
            {/* </div> */}
            {/* </div> */}
            {/* <button
              type="button"
              onClick={handleButtonClick}
              className="rounded-md px-2 py-1 text-xs font-large uppercase tracking-wide text-slate-400 hover:bg-gray-400 hover:text-white transition-colors"
            >
              <IoClose />
            </button> */}
          </div>

          <div className="flex flex-1 flex-col overflow-hidden">
            {activeTab === "chat" && <Chat />}
            {activeTab === "settings" && <Settings />}
            {activeTab === "guidelines" && <Guidelines />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Header + Tabs                                                       */
/* ------------------------------------------------------------------ */

function Header({ onClose }) {
  const health = useLoomaStore((state) => state.health);
  return (
    <div className="flex items-center justify-between bg-slate-900 px-4 py-3">
      <div className="flex items-center gap-3">
        <StatusItem label="Server" online={health.server} />
        <StatusItem label="LLM" online={health.llm} />
        {/* <StatusItem label="Project" online={health.project} /> */}
      </div>
      <button
        type="button"
        onClick={onClose}
        className="rounded-md px-2 py-1 text-xs font-medium uppercase tracking-wide text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
      >
        Close
      </button>
    </div>
  );
}

// Green dot = available. Hollow ring = unavailable.
function StatusItem({ label, online }) {
  return (
    <div className="flex items-center gap-1.5">
      {online ? (
        <span className="h-2 w-2 rounded-full bg-teal-400" />
      ) : (
        <span className="h-2 w-2 rounded-full border border-slate-500" />
      )}
      <span className="text-xs text-slate-400">{label}</span>
    </div>
  );
}

function Tabs({ activeTab, onChange }) {
  return (
    <div className="flex border-b border-slate-200 bg-white">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => onChange(tab.key)}
          className={cx(
            "flex-1 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
            activeTab === tab.key
              ? "border-teal-600 text-teal-700"
              : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700",
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
