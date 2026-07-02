// import React, { useState, useEffect } from "react";
import useLoomaStore from "../store/useLoomaStore.ts";

/**
 * StartupStatus
 * ------------------------------------------------------------------------
 * Boot-sequence card for the moment your chat app spins up. Lines reveal
 * one at a time (like a console log), a progress bar tracks how many
 * checks have passed, and the final two lines land as a highlighted
 * "ready" banner once everything finishes.
 *
 * Usage:
 *   <StartupStatus />
 *   <StartupStatus onComplete={() => console.log("boot finished")} />
 *
 * Drop it in as the first item in your chat history — it runs once on
 * mount and then just sits there as a permanent log entry, same as any
 * other message.
 * ------------------------------------------------------------------------
 */

// const BOOT_LINE = "Looma starting…";

// const CHECK_LINES = [
//   "Configuration loaded",
//   "Backend server is running",
//   "LLM endpoint is reachable",
//   "SSE connection established",
//   "package.json loaded",
//   "README.md loaded",
//   "Project dependencies discovered",
//   "Runtime context initialized",
//   "Current route detected",
//   "Component selection system ready",
//   "Task registry loaded",
//   "Undo/redo history ready",
// ];

// const READY_LINES = [
//   { emoji: "✨", text: "Looma is ready." },
//   { emoji: "💬", text: "You can now chat with your application." },
// ];

// const emojis = {
//   check: "✓",
//   cross: "x",
//   loomaReady: "✨",
//   chat: "💬",
// };

// function cx(...parts) {
//   return parts.filter(Boolean).join(" ");
// }

// Small wrapper that animates a line from "not yet revealed" to "revealed".
// function Line({ revealed, as = "div", className = "", children }) {
//   // const Tag = as;
//   return (
//     <div
//       className={cx(
//         "transition-all duration-300 ease-out",
//         revealed ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
//         className
//       )}
//     >
//       {children}
//     </div>
//   );
// }

// function StartupStatus({ onComplete }) {
//   // visibleCount counts how many lines are shown, where index 0 is the
//   // boot line and indices 1..N are the check lines.
//   const [visibleCount, setVisibleCount] = useState(0);
//   const [isComplete, setIsComplete] = useState(false);
//   const [mounted, setMounted] = useState(false);

//   const totalLines = CHECK_LINES.length + 1;
//   const checksRevealed = Math.max(
//     0,
//     Math.min(visibleCount - 1, CHECK_LINES.length)
//   );

//   // Gentle fade/scale-in for the whole card on mount.
//   useEffect(() => {
//     const t = setTimeout(() => setMounted(true), 20);
//     return () => clearTimeout(t);
//   }, []);

//   // Reveal one line at a time, then flip to "complete" a beat later.
//   useEffect(() => {
//     if (visibleCount >= totalLines) {
//       const t = setTimeout(() => {
//         setIsComplete(true);
//         onComplete?.();
//       }, 350);
//       return () => clearTimeout(t);
//     }
//     const t = setTimeout(() => setVisibleCount((c) => c + 1), 90);
//     return () => clearTimeout(t);
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [visibleCount]);

//   const progress = Math.round((checksRevealed / CHECK_LINES.length) * 100);

//   return (
//     <div
//       className=" flex flex-col justify-center self-center items-center"
//       // className={cx(
//       //   "w-full overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-xl transition-all duration-300 ease-out",
//       //   mounted ? "scale-100 opacity-100" : "scale-95 opacity-0"
//       // )}
//     >
//       {/* Title bar */}
//       {/* <div className="flex items-center justify-between border-b border-slate-800 bg-black px-4 py-2.5">
//         <div className="flex items-center gap-1.5">
//           <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
//           <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
//           <span className="h-2.5 w-2.5 rounded-full bg-teal-500" />
//         </div>
//         <span className="font-mono text-xs tracking-wide text-slate-500">
//           system · boot
//         </span>
//       </div> */}

//       {/* Progress bar */}
//       {/* <div className="h-1 w-full bg-slate-800">
//         <div
//           className="h-1 bg-teal-500 transition-all duration-300 ease-out"
//           style={{ width: `${progress}%` }}
//         />
//       </div> */}

//       <div className="">
//         {/* Boot line */}
//         <Line
//           revealed={visibleCount > 0}
//           className="mb-3 text-sm font-semibold"
//         >
//           🚀 {BOOT_LINE}
//         </Line>

//         {/* Checklist */}
//         <ul className="space-y-1.5 font-mono text-xs">
//           {CHECK_LINES.map((text, idx) => (
//             <Line
//               key={text}
//               as="li"
//               revealed={visibleCount > idx + 1}
//               className="flex items-center gap-2"
//             >
//               <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full  text-teal-400">
//                 {emojis.check}
//               </span>
//               {text}
//             </Line>
//           ))}
//         </ul>

//         {/* Progress count */}
//         <p className="py-2 font-mono text-xs tracking-wide text-slate-500">
//           {checksRevealed}/{CHECK_LINES.length} checks passed
//         </p>
//       </div>

//       {/* Ready banner */}
//       <div
//         className={cx(
//           "px-4 py-2 transition-all duration-500 ease-out",
//           isComplete
//             ? "translate-y-0 opacity-100"
//             : "pointer-events-none -translate-y-1 opacity-0"
//         )}
//       >
//         {READY_LINES.map((line, idx) => (
//           <p
//             key={line.text}
//             className={cx(
//               "flex items-center gap-2 text-sm",
//               idx === 0 ? "font-semibold text-teal-400" : "mt-1 text-slate-700"
//             )}
//           >
//             <span>{line.emoji}</span>
//             {line.text}
//           </p>
//         ))}
//       </div>
//     </div>
//   );
// }

import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  LoaderCircle,
} from "lucide-react";

function StatusRow({ log }) {
  const iconMap = {
    info: <LoaderCircle className="h-4 w-4 animate-spin text-blue-500" />,

    success: <CheckCircle2 className="h-4 w-4 text-green-500" />,

    warning: <AlertTriangle className="h-4 w-4 text-yellow-500" />,

    error: <XCircle className="h-4 w-4 text-red-500" />,
  };

  return (
    <div className="flex items-center gap-2 rounded-md p-1.5 hover:bg-gray-100">
      {iconMap[log.level]}

      <span className="text-sm text-gray-700">{log.text}</span>
    </div>
  );
}

export default function StartupPanel() {
  const startupLogs = useLoomaStore((state) => state.startupLogs);

  return (
    <div className="bg-transparent">
      {startupLogs.map((log) => (
        <StatusRow key={log.id} log={log} />
      ))}
    </div>
  );
}
