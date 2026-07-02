/*

Logs

Purpose:

Conversation history
Debugging
Undo checkpoints
Audit trail

*/

import crypto from "crypto";
import fs from "fs";
import path from "path";
import type { CommandLog, EventType } from "../schemas/index.js";

export class CommandLogger {
  private log: CommandLog;

  constructor({
    type,
    command,
  }: {
    type: "COMMAND" | "UNDO" | "REDO";
    command?: string;
  }) {
    this.log = {
      id: crypto.randomUUID(),
      type,
      status: "RUNNING",
      events: [],
      createdAt: new Date().toISOString(),
      command,
    };
  }

  addEvent(type: EventType, data?: unknown) {
    this.log.events.push({
      type,
      data,
      timestamp: new Date().toISOString(),
    });
  }

  markSuccess() {
    this.log.status = "SUCCESS";

    this.log.completedAt = new Date().toISOString();
  }

  markFailed(error: unknown) {
    this.log.status = "FAILED";

    this.log.completedAt = new Date().toISOString();

    this.log.error = error instanceof Error ? error.message : String(error);
  }

  getLog() {
    return this.log;
  }
}

export async function saveCommandLog(log: CommandLog, logsDir) {
  await fs.promises.mkdir(logsDir, {
    recursive: true,
  });

  const filePath = path.join(logsDir, `${log.id}.json`);
  const latestPath = path.join(logsDir, `latest.json`);

  await fs.promises.writeFile(filePath, JSON.stringify(log, null, 2));
  await fs.promises.writeFile(latestPath, JSON.stringify(log, null, 2));
}
