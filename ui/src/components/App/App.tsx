// import React from "react";
import { useLoomaMessages } from "@ui/hooks/useLoomaMessages.ts";
import "./App.css";
// import StatusList from "../StatusList.tsx";
// import CommandForm from "../CommandForm.tsx";
// import ActionButtons from "../ActionButtons.tsx";
// import GuidelinesDialog from "../GuidelinesDialog.tsx";
// import ChatWidget from "../ChatWidget.tsx";
import ChatWidget from "../ChatWidget.tsx";
// import {
//   Dialog,
//   DialogBackdrop,
//   DialogPanel,
//   Tab,
//   TabGroup,
//   TabList,
//   TabPanel,
//   TabPanels,
// } from "@headlessui/react";

import { useSSE } from "@ui/hooks/useSSE.ts";
import { useHealth } from "../../hooks/useHealth.ts";

// const LOOMA_URL = "http://localhost:4000";

// 3. Set up your Server-Sent Events stream
// const eventSource = new EventSource(`${LOOMA_URL}/events`);

// Helper function to add a line and maintain a maximum limit
// function addStatusLine(text) {
//   const line = document.createElement("div");
//   line.textContent = text;
//   statusPanel.appendChild(line);

//   // Define how many total lines you want to visible at once (e.g., 3 lines)
//   const MAX_LINES = 3;

//   // Clean up older lines so the height never grows
//   while (statusPanel.children.length > MAX_LINES) {
//     statusPanel.removeChild(statusPanel.firstChild);
//   }
// }

// eventSource.addEventListener("progress", (event) => {
//   const data = JSON.parse(event.data);
//   console.log("statusfew", data);
//   const message = data.message;

//   // Appends the new status while cleanly discarding the oldest line
//   addStatusLine(message);
// });

export default function LoomaPanel() {
  // useHealth();
  useLoomaMessages();
  useSSE({ defaultStatus: "Online..." });

  return (
    <ChatWidget />
    // <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg px-4 py-3 sm:px-6">
    //   <div className="max-w-4xl mx-auto flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
    //     <StatusList />

    //     <CommandForm />

    //     <ActionButtons />

    //     <GuidelinesDialog />
    //   </div>
    // </div>
  );
}
