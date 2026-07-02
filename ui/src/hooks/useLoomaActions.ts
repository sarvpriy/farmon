/* eslint-disable @typescript-eslint/no-explicit-any */
// import { useState } from "react";

import { submitCommand, undo, redo } from "@ui/services/api.ts";
import useLoomaStore from "@ui/store/useLoomaStore.ts";
import { INJECTOR_EVENTS } from "@schemas/index.ts";

export function useLoomaActions() {
  const command = useLoomaStore((state) => state.command);
  const isProcessing = useLoomaStore((state) => state.isProcessing);
  const setIsProcessing = useLoomaStore((state) => state.setIsProcessing);
  const selectedComponentId = useLoomaStore(
    (state) => state.selectedComponentId,
  );
  // const statuses = useLoomaStore((state) => state.statuses);
  // const addExecutionEvent = useLoomaStore((state) => state.addExecutionEvent);
  const clearExecutionEvents = useLoomaStore(
    (state) => state.clearExecutionEvents,
  );
  const addMessage = useLoomaStore((state) => state.addMessage);
  const health = useLoomaStore((state) => state.health);
  // const messages = useLoomaStore((state) => state.messages);

  // const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit() {
    if (isProcessing) return;
    // ----------------------------------------------------------
    // STEP 1:
    // Prevent duplicate submissions.
    // ----------------------------------------------------------

    if (isProcessing) return;

    const userCommand = command.trim();

    if (!userCommand) return;

    // ----------------------------------------------------------
    // STEP 2:
    // Validate preconditions before talking to the server.
    // ----------------------------------------------------------

    let validationError: string | null = null;

    if (!health.server) {
      validationError = "Looma Server is not available.";
    } else if (!health.llm) {
      validationError = "LLM is not available.";
    } else if (!selectedComponentId) {
      validationError = "Please select a component.";
    }

    if (validationError) {
      addAgentMessage(validationError);
      return;
    }

    // ----------------------------------------------------------
    // STEP 3:
    // Add the user's message to the conversation.
    // ----------------------------------------------------------

    addUserMessage(userCommand);
    setIsProcessing(true);

    try {
      // ----------------------------------------------------------
      // STEP 4:
      // Submit the command to Looma.
      // ----------------------------------------------------------

      const response = await submitCommand(userCommand, selectedComponentId);

      // ----------------------------------------------------------
      // STEP 5:
      // Display Looma's response.
      // ----------------------------------------------------------

      addAgentMessage(response.message);
    } catch (error) {
      // ----------------------------------------------------------
      // STEP 6:
      // Network failure.
      // ----------------------------------------------------------

      console.error(error);

      addAgentMessage("Unable to connect to Looma Server.");
    } finally {
      // ----------------------------------------------------------
      // STEP 7:
      // Reset UI state.
      // ----------------------------------------------------------

      setIsProcessing(false);
      clearExecutionEvents();
    }
  }

  async function handleUndo() {
    await executeHistoryAction(undo);
  }

  async function handleRedo() {
    await executeHistoryAction(redo);
  }

  function handleSelectComponent() {
    window.parent.postMessage(
      {
        type: INJECTOR_EVENTS.START_COMPONENT_SELECTION,
      },
      "*",
    );
  }

  async function executeHistoryAction(
    action: () => Promise<{ message: string }>,
  ) {
    if (isProcessing) return;

    // ----------------------------------------------------------
    // STEP 1:
    // Validate server availability.
    // ----------------------------------------------------------

    let validationError: string | null = null;

    if (!health.server) {
      validationError = "Looma Server is not available.";
    } else if (!health.llm) {
      validationError = "LLM is not available.";
    }

    if (validationError) {
      addAgentMessage(validationError);
      return;
    }

    // ----------------------------------------------------------
    // STEP 2:
    // Execute the history action.
    // ----------------------------------------------------------

    setIsProcessing(true);

    try {
      const response = await action();

      addAgentMessage(response.message);
    } catch (error) {
      addAgentMessage(
        error instanceof Error ? error.message : "Something went wrong.",
      );
    } finally {
      setIsProcessing(false);
      clearExecutionEvents();
    }
  }

  function addAgentMessage(text: string) {
    addMessage({
      id: crypto.randomUUID(),
      sender: "agent",
      text,
      timestamp: Date.now(),
    });
  }

  function addUserMessage(text: string) {
    addMessage({
      id: crypto.randomUUID(),
      sender: "user",
      text,
      timestamp: Date.now(),
    });
  }

  return {
    // isLoading,
    handleSubmit,
    handleUndo,
    handleRedo,
    handleSelectComponent,
    // handleSettingClick,
  };
}
