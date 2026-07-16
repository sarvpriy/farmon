#!/usr/bin/env node

const command = process.argv[2] ?? "start";
const args = process.argv.slice(3);

switch (command) {
  case "start":
    await import("../server/run.js");
    break;

  case "init": {
    const { initProject } = await import("../server/init.js");

    await initProject({
      yes: args.includes("-y") || args.includes("--yes"),
    });

    break;
  }

  case "--version":
  case "-v": {
    const pkg = await import("../package.json", {
      with: { type: "json" },
    });

    console.log(pkg.default.version);
    break;
  }

  default:
    console.error(`Unknown command "${command}"`);
    process.exit(1);
}
