# Farmon

**Farmon** is an AI-powered coding assistant that understands and edits your React codebase through deterministic code transformations.

Unlike chat-based assistants that generate code snippets, Farmon analyzes your project, plans the required changes, and applies them directly to your source code while preserving project structure and formatting.

> **Status:** Early Preview 🚧

---

## Philosophy

Every week, a new LLM claims higher benchmark scores and better reasoning capabilities.

But there's a more practical question:

> **Can it reliably modify a real codebase over time?**

Software is deterministic. Large Language Models are probabilistic.

Farmon's goal is to bridge these two worlds by combining the reasoning ability of LLMs with deterministic software operations.

Today's AI coding tools often generate entire files or even complete projects in a single step. While this is impressive, the result can quickly become a black box—code that works, but is difficult to understand, review, debug, or evolve.

Farmon takes a different approach.

Instead of asking an LLM to generate an entire application, every request is decomposed into a sequence of small, deterministic mutation tasks. Each task performs one well-defined change to the existing codebase.

This keeps AI-generated software transparent rather than opaque. Every change can be inspected, reviewed, tested, undone, and reproduced.

The LLM decides **what** should change.

Farmon decides **how** that change is applied safely and consistently.

---

## Features

- 🤖 Natural language code editing
- ⚛️ React-aware component manipulation
- 🌳 AST-based code transformations
- 🎯 Deterministic mutation tasks
- ↩️ Built-in undo/redo architecture
- 🎨 Automatic code formatting
- 🔍 Project-aware code analysis

---

## Requirements

- Node.js 22+
- LLM API details (local or remote)

---

## Installation

Install Farmon:

```bash
npm install --save-dev farmon
```

Create farmon.config.js

```js
/** @type {import("farmon").FarmonConfig} */
export default {
  llm: {
    provider: "openai-compatible", // "openai-compatible" | "ollama"
    baseUrl: "http://localhost:1234/v1", // <api-url>
    model: "qwen3.5-9b", // <model-name>
  },
  appUrl: "http://localhost:5173", // user's app url
  serverPort: 3001, // farmon server will run on this port
  uiPort: 5174, // farmon chat box will run on this port

  componentsDirectory: "src", // your component's directory

  componentStructure: [".jsx", ".css", "index.ts"], // your project's component tructure

  componentIdAttribute: "data-farmon-id", // this is for component selection system
  selection: {
    hoverColor: "#3b82f6",
  },
};
```

Start the Farmon server:

```bash
farmon start
# npx farmon start
```

Then import the runtime into your application:

```jsx
// inside main.jsx

import { init } from "farmon";

if (import.meta.env.DEV) {
  init({
    serverUrl: "http://localhost:3001", // the url where farmon server will run
  });
}
```

---

## Example Commands

Farmon understands instructions such as:

- Remove the React starter code.
- Create a hero section.
- Add a navigation bar.
- Add a sticky header.
- Rename this component to `HeroSection`.
- Extract this JSX into a new component.
- Add a footer.
- Change the background color to gray.
- Make this button darker.
- Center this section.
- Rename this CSS class.
- Move this component into the `components/layout` directory.

---

## Roadmap

Current priorities include:

- Improved planning and reasoning
- Better project understanding
- Richer React support
- Enhanced undo/redo
- Expanded mutation library

---

## Contributing

Farmon is under active development. Contributions, ideas, bug reports, and feature requests are welcome.

---

## License

MIT
