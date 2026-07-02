const clearIt = [
  {
    task: "replaceJSX",
    reason:
      "Clear the inner contents of the App component as requested by the user, leaving only the root element.",
    confidence: 1.0,
    payload: {
      componentPath: "../../src/components/App/App.jsx",
      targetElement: "main",
      newJSX: '<main data-farmon-id="cmp_app">',
    },
  },
];

// const clearIt = [
//   {
//     task: "updateComponent",
//     reason:
//       "Clear all content from App component except the root element and Header, removing the default Vite/React boilerplate",
//     confidence: 0.95,
//     payload: {
//       componentPath: "../../src/components/App/App.jsx",
//       jsx: '<main data-farmon-id="cmp_app"><Header /></main>',
//     },
//   },
// ];

const makeAHeader = [
  {
    task: "create-component",
    payload: {
      // create Header component via LLM
      prompt:
        "Create a React functional component named Header that returns a simple semantic header containing a left-aligned logo placeholder, a centered site title 'Site Title', and a right-aligned area for actions. Use JSX, export the component as default. Output JSON only with these keys: componentName (string), componentCode (string, full file content), usageSnippet (string, e.g. '<Header />'). Do not include any explanation.",
    },
  },
  {
    task: "create-file",
    payload: {
      // create Header.jsx file
      directory: "./",
      filename: "Header.jsx",
    },
  },
  {
    task: "code-replace",
    payload: {
      // insert the generated component code into Header.jsx
      filePath: "./",
      fileName: "Header.jsx",
      code: { $ref: "task-0.outputs.componentCode" },
      startLine: 1,
      endLine: undefined,
    },
  },
  {
    task: "include-import",
    payload: {
      // include the import statement in App.jsx to use Header
      filePath: "./App.jsx",
      // "fileName": "App.jsx",
      importPath: "./Header.jsx",
      importType: "default",
      alias: "Header",
    },
  },
  {
    task: "insert-jsx",
    payload: {
      // insert usage snippet into App.jsx
      code: { $ref: "task-0.outputs.usageSnippet" },
      filePath: "./",
      fileName: "App.jsx",
      componentName: "App",
      position: "start",
      // "lineHint": "inside App's return JSX (place near top of returned fragment)"
    },
  },
];

const makeHeader = [
  {
    task_id: "task_1",
    task: "generateComponentCode",
    reason: "Generate polished header JSX with nav links and CTA button",
    confidence: 0.93,
    payload: {
      prompt:
        "Write a Header React functional component named Header with props { color, state }. It must have data-farmon-id='cmp_header' on the root header element with className='main-header'. Import './Header.css', React from 'react', and Logo from './Logo'. Structure: left section with <Logo />, center section with nav links (Home, About, Services, Contact) as an unordered list with className='header-nav', right section with a button className='header-cta' labeled 'Get Started'. Use flex layout via inline styles on the three child divs.",
    },
  },
  {
    task_id: "task_2",
    task: "updateComponent",
    reason: "Replace Header JSX with the generated polished header",
    confidence: 0.93,
    payload: {
      componentName: "Header",
      code: 'import "./Header.css";\nimport React from "react";\nimport Logo from "./Logo";\n\nfunction Header({ color, state }) {\n  return (\n    <header data-farmon-id="cmp_header" className="main-header">\n      <div style={{ flex: 1 }}>\n        <div>\n          <Logo />\n        </div>\n      </div>\n      <div style={{ flex: 1, textAlign: "center" }}>\n        <h1>Site Title</h1>\n      </div>\n      <div style={{ flex: 1, textAlign: "right" }}>{/* Actions */}</div>\n    </header>\n  );\n}\n\nexport default Header;\n',
      newJSX: "$task_1.componentCode",
    },
  },
  {
    task_id: "task_3",
    task: "updateStyles",
    reason: "Fix invalid quoted CSS values in header rule",
    confidence: 0.95,
    payload: {
      cssPath: "../../src/components/App/Header/Header.css",
      target: "header",
      updatedStyles:
        "header {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  padding: 16px 32px;\n  background: #ffffff;\n  border-bottom: 1px solid #e5e7eb;\n  box-shadow: 0 1px 6px rgba(0,0,0,0.06);\n}",
      replaceAll: true,
    },
  },
  {
    task_id: "task_4",
    task: "insertStyles",
    reason: "Add nav and CTA button styles for the new header layout",
    confidence: 0.92,
    payload: {
      cssPath: "../../src/components/App/Header/Header.css",
      styles:
        ".header-nav {\n  display: flex;\n  gap: 28px;\n  list-style: none;\n  margin: 0;\n  padding: 0;\n  justify-content: center;\n}\n\n.header-nav a {\n  text-decoration: none;\n  color: #374151;\n  font-size: 15px;\n  font-weight: 500;\n  transition: color 0.2s;\n}\n\n.header-nav a:hover {\n  color: var(--primary-color);\n}\n\n.header-cta {\n  background: var(--primary-color);\n  color: #ffffff;\n  border: none;\n  padding: 9px 22px;\n  border-radius: 6px;\n  font-size: 15px;\n  font-weight: 600;\n  cursor: pointer;\n  transition: opacity 0.2s;\n}\n\n.header-cta:hover {\n  opacity: 0.85;\n}",
    },
  },
];

const removeStarterCode = [
  {
    task: "update-component",
    payload: {
      file: "../../../src/App.jsx",
      componentName: "App",
      newBody: "return (<main></main>);",
    },
  },
  {
    task: "optimize-imports",
    payload: {
      file: "../../../src/App.jsx",
    },
  },
  {
    task: "update-file",
    payload: {
      file: "../../../src/App.css",
      content: "",
    },
  },
  {
    task: "update-file",
    payload: {
      file: "../../../src/index.css",
      content: "",
    },
  },
];

const createComponent = [
  { task: "createDirectory" },
  { task: "generateCode" },
  { task: "createComponent" },
  { task: "createFile" },
  { task: "insertJSX" },
  { task: "createFile" },
  { task: "generateCode" },
  { task: "createStyles" },
  { task: "insertStyles" },
  { task: "ensureImport" },
  {
    task: "create-component",
    payload: {
      componentName: "Hero",
      props: ["title", "subtitle", "images"],
      body: "<div>Hero Section</div>",
    },
  },
  {
    task: "create-file",
    payload: {
      filePath: "./",
      content: { $ref: "task-0.outputs.componentCode" },
    },
  },
];

const goldenAction = {
  "Create Header": {
    command: "Create Header",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "generateComponentCode",
        payload: {
          prompt: "Simple Header component",
        },
      },
      {
        task_id: "task_2",
        task: "createComponent",
        payload: {
          componentName: {
            $ref: {
              taskId: "task_1",
              path: "componentName",
            },
          },
          componentCode: {
            $ref: {
              taskId: "task_1",
              path: "componentCode",
            },
          },
          parentDirectory: "../../src/components",
        },
      },
    ],
  },
  "Insert Header": {
    command: "Insert Header",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "generateJSX",
        payload: {
          prompt: "Header component usage",
        },
      },
      {
        task_id: "task_2",
        task: "insertJSX",
        payload: {
          componentPath: "../../src/components/App",
          code: {
            $ref: {
              taskId: "task_1",
              path: "generatedCode",
            },
          },
        },
      },
    ],
  },
  "Insert Header styles": {
    command: "Insert Header",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "generateCSS",
        payload: {
          prompt: "Red header with white text",
        },
      },
      {
        task_id: "task_2",
        task: "updateStyles",
        payload: {
          cssPath: "../../src/components/Header/Header.css",
          selector: ".header",
          styles: {
            background: "red",
            color: "white",
          },
        },
      },
    ],
  },
  "Add count state": {
    command: "Add count state",
    componentId: "cmp_app",
    actions: [
      {
        task_id: "task_1",
        task: "insertVariable",
        payload: {
          code: {
            $ref: {
              taskId: "task_0",
              path: "code",
            },
          },
          variableName: "count",
          value: "0",
          scope: "component",
        },
      },
    ],
  },
  "Create increment handler": {
    command: "Create increment handler",
    componentId: "cmp_app",
    actions: [
      {
        task_id: "task_1",
        task: "createFunction",
        payload: {
          functionName: "handleIncrement",
          params: [],
          body: "setCount(count + 1)",
        },
      },
    ],
  },
  "Replace button": {
    command: "Replace button",
    componentId: "cmp_app",
    actions: [
      {
        task_id: "task_1",
        task: "replaceJSX",
        payload: {
          target: "<button>",
          code: "<button>Increment</button>",
        },
      },
    ],
  },
  "Wrap header": {
    command: "Wrap header",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "wrapJSX",
        payload: {
          target: "<Header />",
          wrapper: "<div className='container'></div>",
        },
      },
    ],
  },
  "Rename Header to MainHeader": {
    command: "Rename Header to MainHeader",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "renameComponent",
        payload: {
          componentPath: "../../src/components/Header",
          newComponentName: "MainHeader",
        },
      },
    ],
  },
  "Move MainHeader": {
    command: "Move MainHeader",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "moveComponent",
        payload: {
          sourcePath: "../../src/components/MainHeader",
          destinationPath: "../../src/components/Layout",
        },
      },
    ],
  },
  "Delete MainHeader": {
    command: "Delete MainHeader",
    componentId: "cmp_header",
    actions: [
      {
        task_id: "task_1",
        task: "deleteComponent",
        payload: {
          componentName: "MainHeader",
          parentDirectory: "../../src/components/Layout",
        },
      },
    ],
  },
};

export { clearIt, makeAHeader, makeHeader, removeStarterCode, goldenAction };
