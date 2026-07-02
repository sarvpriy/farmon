#!/usr/bin/env node

const command = process.argv[2] ?? "start";

switch (command) {
  case "start":
    await import("../server/run.js");
    break;

  default:
    console.error(`Unknown command: ${command}`);
    process.exit(1);
}
