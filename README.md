# Farmon

**Farmon** is an AI-powered coding assistant that understands and edits your React codebase through deterministic code transformations.

Unlike chat-based assistants that generate code snippets, Farmon analyzes your project, plans the required changes, and applies them directly to your source code while preserving project structure and formatting.

> **Status:** Early Preview 🚧

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
- **Currently supported:** React (JSX) applications built with Vite.

---

## Installation

Install Farmon:

```bash
npm install --save-dev farmon
```

## Quick Start

Initialize Farmon:

```bash
farmon init
# or
npx farmon init
```

This command will:

- create `farmon.config.js`
- create the `.farmon` workspace
- add `.farmon` to `.gitignore`

**Add farmonVitePlugin:** in `vite.config.js`. make sure to add farmonVitePlugin before react

```ts
import { farmonVitePlugin } from "farmon/vite";

export default defineConfig({
  plugins: [farmonVitePlugin(), react()], // make sure to add farmonVitePlugin before react
});
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
