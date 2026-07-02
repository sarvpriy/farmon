// @ts-nocheck
import fs from "fs";
import path from "path";
import os from "os";
import parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import t from "@babel/types";
import "module-alias/register";

import { ast, mutations, helpers, generators } from "@/execute/tasks/index.ts";
import utils from "@/execute/helpers/general.ts";
import history from "@/execute/history/history-manager.ts";
import rollbackHandlers from "@/execute/history/rollback-handlers.ts";

import parsers from "@/execute/helpers/parsers.ts";

import {
  PROJECT_SRC,
  ROOT_DIR,
  OPERATION_LOG_PATH,
} from "@/looma-internal-configs.ts";

import {
  plannerResponseSchema,
  jsxResponseSchema,
  cssResponseSchema,
  componentResponseSchema,
} from "@/schemas/index.ts";

/*
- clear the project
- create a blank html page
- make/add a header
- add about us link
- make background gray
- make it sticky
- add a sign up button
- mkae this button little darker

add a hero section
- add caraosel images
- 

add a footer
add a sub footer below it

add a call to action above this footer
*/
import {
  clearIt,
  makeAHeader,
  makeHeader,
  removeStarterCode,
  goldenAction,
} from "@/tests/actions/index.ts";

import execute from "@/execute/index.ts";
import z from "zod";

// src/globals.ts

// 1. Define the function
const cl = (...args: any[]) => {
  // 1. Create a dummy error to capture the call stack
  const stack = new Error().stack;

  let locationInfo = "";

  if (stack) {
    // 2. Split stack into lines.
    // line [0] is the Error message itself
    // line [1] is this 'cl' function execution
    // line [2] is the actual file that called 'cl()'
    const stackLines = stack.split("\n");
    const callerLine = stackLines[2];

    if (callerLine) {
      // 3. Use a regex to extract the file path and line number
      // This matches patterns like: /path/to/file.ts:24:12 or \path\to\file.ts:24:12
      const match = callerLine.match(/(?:at\s+)?([^\s)]+):(\d+):(\d+)/);
      if (match) {
        const filePath = match[1];
        const lineNumber = match[2];

        // Extract just the file name out of the absolute path for cleaner logs
        const fileName = filePath.split("/").pop()?.split("\\").pop();

        locationInfo = `[${fileName}:${lineNumber}]`;
      }
    }
  }

  // 4. Print the file location in gray, followed by your actual arguments
  // \x1b[90m triggers gray color, \x1b[0m resets it back to normal
  console.log(`\x1b[90m${locationInfo}\x1b[0m`, ...args);
};

// 2. Assign it to globalThis so it's accessible everywhere at runtime
(globalThis as any).cl = cl;

// 3. For TypeScript: Tell the compiler that 'cl' exists globally
declare global {
  var cl: (...args: any[]) => void;
}

const mutationTaskDetails = {
  // createComponent: {
  //   task: "createComponent",
  //   payload: {
  //     componentName: "LoomaTest",
  //     //   componentCode: `
  //     //     import { useState } from "react";
  //     //     import { useEffect } from "react";
  //     //     import reactLogo from '../../assets/react.svg';
  //     //     import viteLogo from '/vite.svg';
  //     //     import './App.css';
  //     //     import Header from "./Header";
  //     //     function useCustom() {
  //     //       return []
  //     //     }
  //     //     function App({state, theme}) {
  //     //       const [count, setCount] = useState(0);
  //     //       useEffect(() => {}, [])
  //     //       useCustom()
  //     //       return (<main data-farmon-id="cmp_app"><Header />
  //     //           <div>
  //     //             <a href="https://vite.dev" target="_blank">
  //     //               <img src={viteLogo} className="logo" alt="Vite logo" />
  //     //             </a>
  //     //             <a href="https://react.dev" target="_blank">
  //     //               <img src={reactLogo} className="logo react" alt="React logo" />
  //     //             </a>
  //     //           </div>
  //     //           <div className="card">
  //     //             <button onClick={() => setCount(count => count + 1)}>
  //     //               count is {count}
  //     //             </button>
  //     //             <p>
  //     //               Edit <code>src/App.jsx</code> and save to test HMR
  //     //             </p>
  //     //           </div>
  //     //           <Routes>
  //     //             <Route index element={<StepOne />} />
  //     //             <Route path="step-2" element={<StepTwo />} />
  //     //             <Route path="step-3" element={<StepThree />} />
  //     //           </Routes>
  //     //           <DocsLink />
  //     //         </main>);
  //     //     }
  //     //     export default App;
  //     // `,
  //     parentDirectory: "../src/components",
  //   },
  //   taskOutputs: [],
  // },
  // moveComponent: {
  //   task: "moveComponent",
  //   payload: {
  //     sourcePath: "../../src/components/App/Header",
  //     destinationPath: "../../src/components",
  //     createDestination: true,
  //     overwrite: false,
  //   },
  //   taskOutputs: [],
  // },
  // renameComponent: {
  //   task: "renameComponent",
  //   payload: {
  //     componentPath: "../../src/components/App/Header",
  //     newComponentName: "MainHeader",
  //     updateComponentCode: true,
  //   },
  //   taskOutputs: [],
  // },
  // deleteComponent: {
  //   task: "deleteComponent",
  //   payload: {
  //     componentName: "Home",
  //     parentDirectory: "../../src/components",
  //   },
  //   taskOutputs: [],
  // },
  // extractComponent: {
  //   task: "extractComponent",
  //   payload: {
  //     parentComponentPath: "../../src/components/App/App.jsx",
  //     newComponentName: "Button",
  //     targetJSX: `<button onClick={() => setCount((count) => count + 1)}>
  //       count is {count}
  //     </button>`,
  //     componentsDirectory: "../../src/components/App",
  //     includeCss: false,
  //   },
  //   taskOutputs: [],
  // },
  // ensureComponentStructure: {
  //   task: "ensureComponentStructure",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // updateComponentImports: {
  //   task: "updateComponentImports",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // normalizeComponent: {
  //   task: "normalizeComponent",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // insertStyles: {
  //   task: "insertStyles",
  //   payload: {
  //     cssPath: "../../src/components/Home/Home.css",
  //     styles: `
  //     .home {
  //       background: red
  //     }
  //     `,
  //     addNewLine: true,
  //   },
  //   taskOutputs: [],
  // },
  // updateStyles: {
  //   task: "updateStyles",
  //   payload: {
  //     cssPath: "../../src/components/Home/Home.css",
  //     selector: ".home",
  //     styles: {
  //       background: "blue",
  //       padding: "16px",
  //     },
  //     createIfMissing: true,
  //   },
  //   taskOutputs: [],
  // },
  // removeStyles: {
  //   task: "removeStyles",
  //   payload: {
  //     cssPath: "../../src/components/Home/Home.css",
  //     target: {
  //       selector: ".home",
  //       property: "padding",
  //     },
  //     removeAll: false,
  //   },
  //   taskOutputs: [],
  // },
  // ensureStyleFile: {
  //   task: "ensureStyleFile",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // renameCssClass: {
  //   task: "renameCssClass",
  //   payload: {
  //     cssPath: "../../src/components/App/Header/Header.css",
  //     componentJSXPath: "../../src/components/App/Header/Header.jsx",
  //     oldClassName: "header",
  //     newClassName: "main-header",
  //   },
  //   taskOutputs: [],
  // },
  // syncComponentStyles: {
  //   task: "syncComponentStyles",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // resolveImportConflicts: {
  //   task: "resolveImportConflicts",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // resolveCssClassConflicts: {
  //   task: "resolveCssClassConflicts",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // resolveStyleDependencies: {
  //   task: "resolveStyleDependencies",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // createDirectory: {
  //   task: "createDirectory",
  //   payload: {
  //     directoryPath: "../../src/components/Dashboard",
  //   },
  //   taskOutputs: [],
  // },
  // renameDirectory: {
  //   task: "renameDirectory",
  //   payload: {
  //     oldDirectoryPath: "../../src/components/Home",
  //     newDirectoryPath: "../../src/components/Dashboard",
  //   },
  //   taskOutputs: [],
  // },
  // moveDirectory: {
  //   task: "moveDirectory",
  //   payload: {
  //     sourcePath: "../../src/components/Home",
  //     destinationPath: "../../src/components/App",
  //   },
  //   taskOutputs: [],
  // },
  // deleteDirectory: {
  //   task: "deleteDirectory",
  //   payload: {
  //     directoryPath: "../../src/components/Home",
  //   },
  //   taskOutputs: [],
  // },
  // createFile: {
  //   task: "createFile",
  //   payload: {
  //     filePath: "../../src/components/Dashboard/index.ts",
  //     content: "",
  //   },
  //   taskOutputs: [],
  // },
  // renameFile: {
  //   task: "renameFile",
  //   payload: {
  //     oldFilePath: "../../src/components/Dashboard/index.ts",
  //     newFilePath: "../../src/components/Dashboard/index.js",
  //   },
  //   taskOutputs: [],
  // },
  // moveFile: {
  //   task: "moveFile",
  //   payload: {
  //     sourcePath: "../../src/components/Dashboard/index.ts",
  //     destinationPath: "../../src/components/Home/index.js",
  //   },
  //   taskOutputs: [],
  // },
  // deleteFile: {
  //   task: "deleteFile",
  //   payload: {
  //     filePath: "../../src/components/Home/index.js",
  //   },
  //   taskOutputs: [],
  // },
  // optimizeImports: {
  //   task: "optimizeImports",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // insertVariable: {
  //   task: "insertVariable",
  //   payload: {
  //     code: `
  //         import React from "react";
  //         function App() {}`,
  //     variableName: "API_URL",
  //     value: "/api",
  //     scope: "function",
  //     functionName: "App",
  //   },
  //   taskOutputs: [],
  // },
  // updateVariable: {
  //   task: "updateVariable",
  //   payload: {
  //     code: `
  //     import React from "react";
  //     function App() {
  //       const API_URL = "/api";
  //     }`,
  //     variableName: "API_URL",
  //     newValue: "/newapi",
  //   },
  //   taskOutputs: [],
  // },
  // deleteVariable: {
  //   task: "deleteVariable",
  //   payload: {
  //     code: `
  //     import React from "react";
  //     function App() {
  //       const API_URL = "/api";
  //     }`,
  //     variableName: "API_URL",
  //     line: "",
  //   },
  //   taskOutputs: [],
  // },
  // createFunction: {
  //   task: "createFunction",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // updateFunction: {
  //   task: "updateFunction",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // deleteFunction: {
  //   task: "deleteFunction",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // insertJSX: {
  //   task: "insertJSX",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // replaceJSX: {
  //   task: "replaceJSX",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // wrapJSX: {
  //   task: "wrapJSX",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // moveJSX: {
  //   task: "moveJSX",
  //   payload: {},
  //   taskOutputs: [],
  // },
  // removeJSX: {
  //   task: "removeJSX",
  //   payload: {},
  //   taskOutputs: [],
  // },
};

const astTaskDetails = {
  removeImport: {
    task: "removeImport",
    payload: {
      code: `
import { useState } from 'react';
import reactLogo from '../../assets/react.svg';
import viteLogo from '/vite.svg';
import './App.css';
import Header from "./Header";
function App() {
  const [count, setCount] = useState(0);
  return <main data-farmon-id="cmp_app"><Header />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <DocsLink />
    </main>;
}
export default App;
    `,
      source: "react",
      importName: "useState",
      importType: "named",
    },
    taskOutputs: [],
  },
  ensureImport: {
    task: "ensureImport",
    taskOutputs: [],
    payload: {
      code: `
        import reactLogo from '../../assets/react.svg';
        import viteLogo from '/vite.svg';
        import './App.css';
        import Header from "./Header";
        function App() {
          const [count, setCount] = useState(0);
          return <main data-farmon-id="cmp_app"><Header />
              <div>
                <a href="https://vite.dev" target="_blank">
                  <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                  <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
              </div>
              <div className="card">
                <button onClick={() => setCount(count => count + 1)}>
                  count is {count}
                </button>
                <p>
                  Edit <code>src/App.jsx</code> and save to test HMR
                </p>
              </div>
              <DocsLink />
            </main>;
        }
        export default App;
    `,
      source: "react",
      importName: "useState",
      importType: "named",
    },
  },
  optimizeImports: {
    task: "optimizeImports",
    taskOutputs: [],
    payload: {
      code:
        'import { useEffect, useState } from "react";\n' +
        "import reactLogo from '../../assets/react.svg';\n" +
        "import viteLogo from '/vite.svg';\n" +
        "import './App.css';\n" +
        'import Header from "./Header";\n' +
        "function App() {\n" +
        "  const [count, setCount] = useState(0);\n" +
        '  return <main data-farmon-id="cmp_app"><Header />\n' +
        "              <div>\n" +
        '                <a href="https://react.dev" target="_blank">\n' +
        '                  <img src={reactLogo} className="logo react" alt="React logo" />\n' +
        "                </a>\n" +
        "              </div>\n" +
        '              <div className="card">\n' +
        "                <button onClick={() => setCount(count => count + 1)}>\n" +
        "                  count is {count}\n" +
        "                </button>\n" +
        "                <p>\n" +
        "                  Edit <code>src/App.jsx</code> and save to test HMR\n" +
        "                </p>\n" +
        "              </div>\n" +
        "              <DocsLink />\n" +
        "            </main>;\n" +
        "}\n" +
        "export default App;",
    },
  },
  insertVariable: {
    task: "insertVariable",
    taskOutputs: [],
    payload: {
      code: `
          import React from "react";
          function App() {}`,
      variableName: "API_URL",
      value: "/api",
      scope: "function",
      functionName: "App",
    },
  },
  updateVariable: {
    task: "updateVariable",
    taskOutputs: [],
    payload: {
      code: `
      import React from "react";
      function App() {
        const API_URL = "/api";
      }`,
      variableName: "API_URL",
      newValue: "/newapi",
    },
  },
  deleteVariable: {
    task: "deleteVariable",
    taskOutputs: [],
    payload: {
      code: `
          import React from "react";
          function App() {
            const API_URL = "/api";
          }`,
      variableName: "API_URL",
      line: "",
    },
  },
  // createFunction: {
  //   task: "createFunction",
  //   taskOutputs: [],
  //   payload: {
  //     code,
  //     functionName,
  //     params = [],
  //     body = "",
  //     scope = "global",
  //     parentFunctionName,
  //   },
  // },
  // updateFunction: {
  //   task: "updateFunction",
  //   taskOutputs: [],
  //   payload: { code, functionName, newBody, line },
  // },
  // deleteFunction: {
  //   task: "deleteFunction",
  //   taskOutputs: [],
  //   payload: { code, functionName, line },
  // },
  insertJSX: {
    task: "insertJSX",
    taskOutputs: [],
    payload: {
      code:
        'import { useState } from "react";\n' +
        'import reactLogo from "../../assets/react.svg";\n' +
        'import viteLogo from "/vite.svg";\n' +
        'import "./App.css";\n' +
        "\n" +
        "function App() {\n" +
        "  const [count, setCount] = useState(0);\n" +
        "  return (\n" +
        '    <<main data-farmon-id="cmp_app">\n' +
        " <div>\n" +
        '        <a href="https://vite.dev" target="_blank">\n' +
        ' <img src={viteLogo} className="logo" alt="Vite logo" />\n' +
        "        </a>\n" +
        '        <a href="https://react.dev" target="_blank">\n' +
        '          <img src={reactLogo} className="logo react" alt="React logo" />\n' +
        "        </a>\n" +
        "      </div>\n" +
        '      <div className="card">\n' +
        "        <button onClick={() => setCount((count) => count + 1)}>\n" +
        "          count is {count}\n" +
        "        </button>\n" +
        "        <p>\n" +
        "          Edit <code>src/App.jsx</code> and save to test HMR\n" +
        "        </p>\n" +
        "      </div>\n" +
        "    </main>\n" +
        "  );\n" +
        "}\n" +
        "\n" +
        "export default App;\n",
      componentName: "App",
      targetElement: "img.logo.react",
      jsx: "<Badge />",
      position: "last",
    },
  },
  replaceJSX: {
    task: "replaceJSX",
    taskOutputs: [],
    payload: {
      code: 'import { useState } from "react";\nimport reactLogo from "../../assets/react.svg";\nimport viteLogo from "/vite.svg";\nimport "./App.css";\n\nfunction App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main data-farmon-id="cmp_app">\n      <div>\n        <a href="https://vite.dev" target="_blank">\n          <img src={viteLogo} className="logo" alt="Vite logo" />\n        </a>\n        <a href="https://react.dev" target="_blank">\n          <img src={reactLogo} className="logo react" alt="React logo" />\n        </a>\n      </div>\n      <div className="card">\n        <button onClick={() => setCount((count) => count + 1)}>\n          count is {count}\n        </button>\n        <p>\n          Edit <code>src/App.jsx</code> and save to test HMR\n        </p>\n      </div>\n    </main>\n  );\n}\n\nexport default App;\n',
      componentName: "App",
      targetElement: "main",
      newJSX: '<main data-farmon-id="cmp_app"></main>',
    },
  },
  removeJSX: {
    task: "removeJSX",
    taskOutputs: [],
    payload: {
      code: `function App() {
  const [count, setCount] = useState(0);
  return (<div data-farmon-id="cmp_app"><Header />
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <DocsLink />
    </div>);}`,
      componentName: "App",
      targetElement: "a[href='https://vite.dev']",
    },
  },
  wrapJSX: {
    task: "wrapJSX",
    taskOutputs: [],
    payload: {
      code: `function App() {
  const [count, setCount] = useState(0);
  return (<main data-farmon-id="cmp_app">
      <header>
        <button>Login</button>
      </header>
      <div id="logo-container">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <DocsLink />
      <footer></footer>
    </main>);}`,
      componentName: "App",
      targetElement: `header`,
      wrapperJSX: `<div className="container"></div>`,
    },
  },
  moveJSX: {
    task: "moveJSX",
    taskOutputs: [],
    payload: {
      code: `function App() {
  const [count, setCount] = useState(0);
  return (<main data-farmon-id="cmp_app">
      <header>
        <button>Login</button>
      </header>
      <div id="logo-container">
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>
      <div className="card">
        <button onClick={() => setCount(count => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
      <DocsLink />
      <footer></footer>
    </main>);}`,
      componentName: "App",
      sourceElement: `button`,
      destinationElement: `footer`,
    },
  },
};

const helpersTaskDetails = {
  // insertCode: {
  //   task: "insertCode",
  //   taskOutputs: [],
  //   payload: {
  //     filePath,
  //     codeToInsert,
  //     insertAt = "end",
  //   },
  // },
  // ensureLibrary: {
  //   task: "ensureLibrary",
  //   taskOutputs: [],
  //   payload: {
  //     libraryName: "axios",
  //   },
  // },
  findNodeByLine: {
    task: "ensureLibrary",
    taskOutputs: [],
    payload: {
      ast,
      line: 11,
    },
  },
  // ensureComponentStructure: {
  //   task: "ensureComponentStructure",
  //   taskOutputs: [],
  //   payload: {
  //     componentPath,
  //     componentName,
  //     ensureCss = true,
  //     ensureIndex = true,
  //     createIfMissing = true,
  //   },
  // },
  // updateComponentImports: {
  //   task: "updateComponentImports",
  //   taskOutputs: [],
  //   payload: {
  //     componentPath,
  //     operations = [],
  //   },
  // },
  // normalizeComponent: {
  //   task: "normalizeComponent",
  //   taskOutputs: [],
  //   payload: {
  //     componentPath,
  //     componentName,
  //     ensureCss = true,
  //     ensureIndex = true,
  //     normalizeExports = true,
  //   },
  // },
  // findComponentDirectory: {
  //   task: "findComponentDirectory",
  //   taskOutputs: [],
  //   payload: {
  //     rootDirectory,
  //     componentName,
  //     caseSensitive = false,
  //     returnFirst = true,
  //   },
  // },
  // inferComponentName: {
  //   task: "inferComponentName",
  //   taskOutputs: [],
  //   payload: {
  //     userInput = "",
  //     filePath = "",
  //     jsxCode = "",
  //     stopWords = [
  //       "make",
  //       "update",
  //       "delete",
  //       "move",
  //       "rename",
  //       "extract",
  //       "component",
  //       "section",
  //       "add",
  //       "remove",
  //       "create",
  //       "change",
  //       "modify",
  //       "the",
  //       "a",
  //       "an",
  //     ],
  //   },
  // },
  // ensureStyleFile: {
  //   task: "ensureStyleFile",
  //   taskOutputs: [],
  //   payload: {
  //     componentPath,
  //     componentName,
  //     initialStyles = "",
  //   },
  // },
  // findCssSelector: {
  //   task: "findCssSelector",
  //   taskOutputs: [],
  //   payload: {
  //     ast,
  //     selector,
  //     findAll = true,
  //   },
  // },
  // resolveStyleDependencies: {
  //   task: "resolveStyleDependencies",
  //   taskOutputs: [],
  //   payload: {
  //     cssPath,
  //     availableDependencyFiles = [],
  //     autoImport = true,
  //   },
  // },
  // parseAST: {
  //   task: "parseAST",
  //   taskOutputs: [],
  //   payload: {
  //     code,
  //   },
  // },
  // parseCSS: {
  //   task: "parseCSS",
  //   taskOutputs: [],
  //   payload: {
  //     cssCode,
  //     cssPath,
  //   },
  // },
  // parseRoutes(ast)
  // parseComponentDependencies(ast)
  // parseProps(ast)
  // parseStateUsage(ast)
  // parseEventHandlers(ast)
  // parseAPICalls(ast)
  // parseTypescriptTypes(ast)
  // parseExports(ast)
  // parseHooksUsage(ast)
  // parseDOMHierarchy(ast)
  // generateCodeFromAST(ast, options = {}},
};

async function testMutationTasks() {
  const results = [];

  for (const [taskName, taskConfig] of Object.entries(mutationTaskDetails)) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing: ${taskName}`);

    try {
      // ----------------------------------------------
      // Execute mutation
      // ----------------------------------------------

      const executionResult = await execute.executeTask(
        taskConfig as {
          task: keyof typeof helpersTaskDetails;
          payload: unknown;
          taskOutputs: object;
        },
      );

      console.log("Execution Result:");
      console.log(executionResult);

      // ----------------------------------------------
      // Skip rollback if execution failed
      // ----------------------------------------------

      if (executionResult?.success === false) {
        results.push({
          task: taskName,
          success: false,
          message: executionResult.message,
          rollback: false,
        });

        continue;
      }

      // ----------------------------------------------
      // Run rollback
      // ----------------------------------------------

      // const rollbackResult = await runRollback();

      // console.log("Rollback Result:");
      // console.log(rollbackResult);

      results.push({
        task: taskName,
        success: true,
      });
    } catch (error) {
      console.error(`Failed: ${taskName}`);
      console.error(error);

      results.push({
        task: taskName,
        success: false,
        rollback: false,
        error: error.message,
      });
    }
  }

  console.log("\n==================================================");
  console.log("TEST SUMMARY");
  console.table(results);

  return results;
}

async function testAstTasks({ astTaskDetails, execute }) {
  const results = [];

  for (const [taskName, taskConfig] of Object.entries(astTaskDetails)) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing: ${taskName}`);

    try {
      // ----------------------------------------------
      // Execute mutation
      // ----------------------------------------------

      const executionResult = await execute(taskConfig);

      console.log("Execution Result:");
      console.log(executionResult);

      // ----------------------------------------------
      // Skip rollback if execution failed
      // ----------------------------------------------

      if (executionResult?.success === false) {
        results.push({
          task: taskName,
          success: false,
          message: executionResult.message,
          // rollback: false,
        });

        continue;
      }

      // ----------------------------------------------
      // Run rollback
      // ----------------------------------------------

      // const rollbackResult = await runRollback();

      // console.log("Rollback Result:");
      // console.log(rollbackResult);

      results.push({
        task: taskName,
        success: true,
        // rollback: true,
      });
    } catch (error) {
      console.error(`Failed: ${taskName}`);
      console.error(error);

      results.push({
        task: taskName,
        success: false,
        // rollback: false,
        error: error.message,
      });
    }
  }

  console.log("\n==================================================");
  console.log("TEST SUMMARY");
  console.table(results);

  return results;
}

async function testHelpersTasks({ helpersTaskDetails, execute }) {
  const results = [];

  for (const [taskName, taskConfig] of Object.entries(helpersTaskDetails)) {
    console.log(`\n--------------------------------------------------`);
    console.log(`Testing: ${taskName}`);

    try {
      // ----------------------------------------------
      // Execute mutation
      // ----------------------------------------------

      const executionResult = await execute(taskConfig);

      console.log("Execution Result:");
      console.log(executionResult);

      // ----------------------------------------------
      // Skip rollback if execution failed
      // ----------------------------------------------

      if (executionResult?.success === false) {
        results.push({
          task: taskName,
          success: false,
          message: executionResult.message,
          // rollback: false,
        });

        continue;
      }

      // ----------------------------------------------
      // Run rollback
      // ----------------------------------------------

      // const rollbackResult = await runRollback();

      // console.log("Rollback Result:");
      // console.log(rollbackResult);

      results.push({
        task: taskName,
        success: true,
        // rollback: true,
      });
    } catch (error) {
      console.error(`Failed: ${taskName}`);
      console.error(error);

      results.push({
        task: taskName,
        success: false,
        // rollback: false,
        error: error.message,
      });
    }
  }

  console.log("\n==================================================");
  console.log("TEST SUMMARY");
  console.table(results);

  return results;
}

// const readline from "node:readline/promises");
// const { stdin: input, stdout: output } from "node:process");

// async function askQuestion() {
//   const rl = readline.createInterface({ input, output });

//   const name = await rl.question("What is your name? ");

//   console.log(`Hello, ${name}!`);

//   rl.close();
// }

// askQuestion();

(async function () {
  // console.log(await utils.getExportedFunctionNames("generators"));
  // function issuesToMessages(issues: Array<{ message: string }>): string[] {
  //   return issues.map((i) => i.message);
  // }
  // try {
  //   plannerResponseSchema.parse([
  //     {
  //       task: "updateStyles",
  //       reason: "Set background color of the main root element to red",
  //       confidence: 0.9,
  //     },
  //   ]);
  //   // const message = z.prettifyError(result.error);
  //   // console.log(message);
  //   // if (!result.success) {
  //   // }
  // } catch (error) {
  //   // console.log(issuesToMessages(error.issues));
  //   console.log(error.issues.map((i) => i.message).join(", "));
  // }
  // try {
  //   z.union([
  //     jsxResponseSchema,
  //     cssResponseSchema,
  //     componentResponseSchema,
  //   ]).parse({
  //     type: "jsx",
  //     component: "vwdovwh",
  //     css: "iojvwpovjw",
  //   });
  // } catch (error) {
  //   console.log(error.issues.map((i) => i.message).join(","));
  // }
  // console.log(fs.mkdtempSync(path.join(os.tmpdir(), "looma-test-")));
  // testUtilFunction();
  // testHelpers();
  // const tracedMyFunc = trace(runActions);
  // const tracedMyFunc = trace(runPlannerTask);
  // const tracedMyFunc = trace(runRollback);
  // await tracedMyFunc("findImportDeclaration");
  // console.log(path.resolve(process.cwd()));
  // await testMutationTasks();
  // await testAstTasks({
  //   astTaskDetails,
  //   execute: execute.executeTask,
  // });
  // await testHelpersTasks({
  //   helpersTaskDetails,
  //   execute: execute.executeTask,
  // });
  // console.log(await utils.generateTasksDocs());
  // const module = await import("../lib/tasks/ast.ts");
  // console.log(Object.keys(module.default));
  // console.log(utils.generateTasksDocs("./lib/tasks/generators.ts"));
  // console.log(utils.generateTasksDocs("./lib/tasks/helpers.ts"));
  // console.log(utils.generateTasksDocs("./lib/tasks/mutations.ts"));
  // console.log(utils.generateTasksDocs("./lib/tasks/ast.ts"));
  // console.log(utils.getExportedFunctionNames("./lib/tasks/mutations.ts"));
})();

function testUtilFunction() {
  console.log(
    utils.resolveTaskReferences({
      value: {
        cssPath: {
          $ref: {
            source: "componentContext",
            path: "cssCode",
          },
        },
        selector: "*",
        styles: {
          "background-color": "#3b82f6",
        },
        createIfMissing: true,
      },
      taskOutputs: {
        componentContext: {
          componentId: "cmp_app",
          componentName: "App",
          filePath: "../src/components/App/App.jsx",
          cssPath: "../src/components/App/App.css",
          importPath: "../src/components/App/App.jsx",
          parentComponent: null,
          childComponents: ["Header"],
          exported: true,
          props: [],
          rootElement: "main",
          lastUpdated: 1782593596464,
          componentCode:
            'import { useState } from "react";\nimport reactLogo from "../../assets/react.svg";\nimport viteLogo from "/vite.svg";\nimport "./App.css";\nimport Header from "./Header";\n\nfunction App() {\n  const [count, setCount] = useState(0);\n  return (\n    <main data-farmon-id="cmp_app">\n      <Header />\n      <div>\n        <a href="https://vite.dev" target="_blank">\n          <img src={viteLogo} className="logo" alt="Vite logo" />\n        </a>\n        <a href="https://react.dev" target="_blank">\n          <img src={reactLogo} className="logo react" alt="React logo" />\n        </a>\n      </div>\n      <div className="card">\n        <button onClick={() => setCount((count) => count + 1)}>\n          count is {count}\n        </button>\n        <p>\n          Edit <code>src/App.jsx</code> and save to test HMR\n        </p>\n      </div>\n    </main>\n  );\n}\n\nexport default App;\n',
          cssCode:
            "#root {\n  max-width: 1920px;\n  margin: 0 auto;\n  padding: 2rem;\n  text-align: center;\n}\n\n.logo {\n  height: 6em;\n  padding: 1.5em;\n  will-change: filter;\n  transition: filter 300ms;\n}\n.logo:hover {\n  filter: drop-shadow(0 0 2em #646cffaa);\n}\n.logo.react:hover {\n  filter: drop-shadow(0 0 2em #61dafbaa);\n}\n\n@keyframes logo-spin {\n  from {\n    transform: rotate(0deg);\n  }\n  to {\n    transform: rotate(360deg);\n  }\n}\n\n@media (prefers-reduced-motion: no-preference) {\n  a:nth-of-type(2) .logo {\n    animation: logo-spin infinite 20s linear;\n  }\n}\n\n.card {\n  padding: 2em;\n}\n\n.read-the-docs {\n  color: #888;\n}\n\nmain {\n  background-color: #2ecc71;\n}\n",
        },
      },
    }),
  );

  const componentCode = `
  import { useState } from "react";
  import { useEffect } from "react";
  import reactLogo from '../../assets/react.svg';
  import viteLogo from '/vite.svg';
  import './App.css';
  import Header from "./Header";
  const button = () => {
    return (<button>Button</button>)
  };
  function App() {
    const [count, setCount] = useState(0);
    return (<main data-farmon-id="cmp_app"><Header />
        <div>
          <a href="https://vite.dev" target="_blank">
            <img src={viteLogo} className="logo" alt="Vite logo" />
          </a>
          <a href="https://react.dev" target="_blank">
            <img src={reactLogo} className="logo react" alt="React logo" />
          </a>
        </div>
        <div className="card">
          <button onClick={() => setCount(count => count + 1)}>
            count is {count}
          </button>
          <p>
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <DocsLink />
      </main>);
  }
  export default App;
`;
}

function testHelpers() {
  const componentCode = `
        import { useState } from "react";
        import { useEffect } from "react";
        import reactLogo from '../../assets/react.svg';
        import viteLogo from '/vite.svg';
        import './App.css';
        import Header from "./Header";
        function useCustom() {
          return []
        }
        function App({state, theme}) {
          const [count, setCount] = useState(0);
          useEffect(() => {}, [])
          useCustom()
          return (<main data-farmon-id="cmp_app"><Header />
              <div>
                <a href="https://vite.dev" target="_blank">
                  <img src={viteLogo} className="logo" alt="Vite logo" />
                </a>
                <a href="https://react.dev" target="_blank">
                  <img src={reactLogo} className="logo react" alt="React logo" />
                </a>
              </div>
              <div className="card">
                <button onClick={() => setCount(count => count + 1)}>
                  count is {count}
                </button>
                <p>
                  Edit <code>src/App.jsx</code> and save to test HMR
                </p>
                
              </div>
              <Routes>
                <Route index element={<StepOne />} />
                <Route path="step-2" element={<StepTwo />} />
                <Route path="step-3" element={<StepThree />} />
              </Routes>
              <DocsLink />
            </main>);
        }
        export default App;
    `;
  const ast = parsers.parseAST({ code: componentCode });

  console.log(parsers.parseHooksUsage({ ast }));

  // console.log(helpers.findNodeByLine({ ast, line: 9 }));
  // console.log(helpers.findComponentByName({ ast, componentName: "App" }));
  // console.log(helpers.findJSXElement({ ast, elementName: "Header" }));
  // console.log(helpers.findComponentDirectory({ componentName: "Header" }));

  // console.log(JSON.stringify(helpers.parseJSCode({ code: componentCode })));

  // console.log(
  //   helpers.isImportUsed({
  //     ast: ast,
  //     name: "useState",
  //   })
  // );

  // const importPath = helpers.findImportDeclaration({
  //   ast: ast,
  //   source: "react",
  // });
  // if (importPath) {
  //   console.log(importPath.node);
  // }

  // const importDeclaration = helpers.buildImportDeclaration({
  //   source: "react",
  //   defaultImport: "React",
  //   namedImports: ["useEffect", "useState"],
  //   namespaceImport: null,
  // });
  // console.log(JSON.stringify(importDeclaration));

  // const importDeclaration = helpers.getImportSpecifiers({
  //   importDeclaration: {
  //     type: "ImportDeclaration",
  //     specifiers: [
  //       {
  //         type: "ImportDefaultSpecifier",
  //         local: { type: "Identifier", name: "React" },
  //       },
  //       {
  //         type: "ImportSpecifier",
  //         local: { type: "Identifier", name: "useEffect" },
  //         imported: { type: "Identifier", name: "useEffect" },
  //       },
  //       {
  //         type: "ImportSpecifier",
  //         local: { type: "Identifier", name: "useState" },
  //         imported: { type: "Identifier", name: "useState" },
  //       },
  //     ],
  //     source: { type: "StringLiteral", value: "react" },
  //     attributes: null,
  //   },
  // });
  // console.log(importDeclaration);

  // const importDeclaration = helpers.removeImportSpecifier({
  //   importDeclaration: {
  //     type: "ImportDeclaration",
  //     specifiers: [
  //       {
  //         type: "ImportDefaultSpecifier",
  //         local: { type: "Identifier", name: "React" },
  //       },
  //       {
  //         type: "ImportSpecifier",
  //         local: { type: "Identifier", name: "useEffect" },
  //         imported: { type: "Identifier", name: "useEffect" },
  //       },
  //       {
  //         type: "ImportSpecifier",
  //         local: { type: "Identifier", name: "useState" },
  //         imported: { type: "Identifier", name: "useState" },
  //       },
  //     ],
  //     source: { type: "StringLiteral", value: "react" },
  //     attributes: null,
  //   },
  //   name: "useEffect",
  // });
  // console.log(JSON.stringify(importDeclaration));

  // const cssCode = `
  //   :root {
  //     font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  //     line-height: 1.5;
  //     font-weight: 400;

  //     color-scheme: light dark;
  //     color: rgba(255, 255, 255, 0.87);
  //     background-color: #242424;

  //     font-synthesis: none;
  //     text-rendering: optimizeLegibility;
  //     -webkit-font-smoothing: antialiased;
  //     -moz-osx-font-smoothing: grayscale;
  //   }

  //   a {
  //     font-weight: 500;
  //     color: #646cff;
  //     text-decoration: inherit;
  //   }
  //   a:hover {
  //     color: #535bf2;
  //   }

  //   body {
  //     margin: 0;
  //     display: flex;
  //     place-items: center;
  //     min-width: 320px;
  //     min-height: 100vh;
  //   }

  // `;

  // const { ast: cssAst } = helpers.parseCSS({
  //   cssCode,
  // });

  // console.log(helpers.findCssSelector({ ast: cssAst, selector: ".body" }));
  // console.log(helpers.ensureStyleFile({ componentName: "Heajgjhder" }));
}

async function runPlannerTask(task) {
  const resp = await execute.executeTask(helpersTaskDetails[task]);
  console.log("taskresp", resp);
  // const resp = createComponent({
  //   componentName: "Hero",
  //   props: ["title", "subtitle", "images"],
  //   body: "<div>Hero Section</div>",
  // });
  // const resp = updateComponent({
  //   code: `function Header() {
  //         return <div>Hello</div>;
  //       }`,
  //   componentName: "Header",
  //   newJSX: `<header><h1>Hello</h1></header>`,
  // });
  // const resp = moveComponent({
  //   sourcePath: "../../src/components/App/Header",
  //   destinationPath: "../../src/components",
  //   createDestination: true,
  //   overwrite: false,
  // });
  // const resp = extractComponent({
  //   parentComponentPath: "../../src/components/App/App.jsx",
  //   newComponentName: "DocsLink",
  //   targetJSX: `<p className="read-the-docs">
  //       Click on the Vite and React logos to learn more
  //     </p>`,
  //   componentsDirectory: "../../src/components/App",
  //   includeCss: true,
  // });
  // const resp = insertJSX({
  //   code: `function App() {
  // const [count, setCount] = useState(0);
  // return (<main data-farmon-id="cmp_app"><Header />
  //     <div>
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <div className="card">
  //       <button onClick={() => setCount(count => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <DocsLink />
  //   </main>);}`,
  //   componentName: "App",
  //   targetElement: "main",
  //   jsx: `<p className="read-the-docs">
  //       Click on the Vite and React logos to learn more
  //     </p>`,
  // });
  // const resp = replaceJSX({
  //   code: `function App() {
  // const [count, setCount] = useState(0);
  // return (<main data-farmon-id="cmp_app"><Header />
  //     <div>
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <div className="card">
  //       <button onClick={() => setCount(count => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <DocsLink />
  //   </main>);}`,
  //   componentName: "App",
  //   targetElement: "Header",
  //   newJSX: `<header><h1>Hello</h1></header>`,
  // });
  // const resp = removeJSX({
  //   code: `function App() {
  // const [count, setCount] = useState(0);
  // return (<main data-farmon-id="cmp_app"><Header />
  //     <div>
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <div className="card">
  //       <button onClick={() => setCount(count => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <DocsLink />
  //   </main>);}`,
  //   componentName: "App",
  //   targetElement: "Header",
  // });
  // const resp = moveJSX({
  //   code: `function App() {
  // const [count, setCount] = useState(0);
  // return (<main data-farmon-id="cmp_app">
  //     <header>
  //       <button>Login</button>
  //     </header>
  //     <div id="logo-container">
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <div className="card">
  //       <button onClick={() => setCount(count => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <DocsLink />
  //     <footer></footer>
  //   </main>);}`,
  //   componentName: "App",
  //   sourceElement: `button`,
  //   destinationElement: `footer`,
  // });
  // const resp = wrapJSX({
  //   code: `function App() {
  // const [count, setCount] = useState(0);
  // return (<main data-farmon-id="cmp_app">
  //     <header>
  //       <button>Login</button>
  //     </header>
  //     <div id="logo-container">
  //       <a href="https://vite.dev" target="_blank">
  //         <img src={viteLogo} className="logo" alt="Vite logo" />
  //       </a>
  //       <a href="https://react.dev" target="_blank">
  //         <img src={reactLogo} className="logo react" alt="React logo" />
  //       </a>
  //     </div>
  //     <div className="card">
  //       <button onClick={() => setCount(count => count + 1)}>
  //         count is {count}
  //       </button>
  //       <p>
  //         Edit <code>src/App.jsx</code> and save to test HMR
  //       </p>
  //     </div>
  //     <DocsLink />
  //     <footer></footer>
  //   </main>);}`,
  //   componentName: "App",
  //   targetElement: `header`,
  //   wrapperJSX: `<div className="container"></div>`,
  // });
  // const resp = ensureComponentStructure({
  //   componentPath: "../../src/components/App/Footer",
  //   componentName: "Footer",
  //   ensureCss: true,
  //   ensureIndex: true,
  //   createIfMissing: true,
  // });
  // const resp = updateComponentImports({
  //   componentPath: "../../src/components/App/App.jsx",
  //   operations: [
  //     {
  //       type: "remove",
  //       importName: "DocsLink",
  //       // importPath: "../ui/Button",
  //     },
  //   ],
  // });
  // const resp = normalizeComponent({
  //   componentPath: "../../src/components/App/Footer",
  //   componentName: "Footer",
  //   ensureCss: true,
  //   ensureIndex: true,
  //   normalizeExports: true,
  // });
  // const resp = findComponentDirectory({
  //   rootDirectory: "../../src/components",
  //   componentName: "Footer",
  //   caseSensitive: false,
  //   returnFirst: true,
  // });
  // const resp = inferComponentName({
  //   userInput: "make red navbar",
  //   filePath: "../../src/components/App/Navbar/Navbar.jsx",
  //   jsxCode: `
  //     function Navbar() {}
  //   `,
  //   stopWords: [
  //     "make",
  //     "update",
  //     "delete",
  //     "move",
  //     "rename",
  //     "extract",
  //     "component",
  //     "section",
  //     "add",
  //     "remove",
  //     "create",
  //     "change",
  //     "modify",
  //     "the",
  //     "a",
  //     "an",
  //   ],
  // });
  // const resp = await createFile({
  //   filePath: "../../src/components/Hero/Hero.jsx",
  //   content:
  //     "function Hero({\n" +
  //     "  title,\n" +
  //     "  subtitle,\n" +
  //     "  images\n" +
  //     "}) {\n" +
  //     "  return <div>Hero Section</div>;\n" +
  //     "}\n" +
  //     "export default Hero;",
  // });
  // const resp = deleteFile({
  //   filePath: "../../src/components/App/DocsLink/DocsLink.css",
  // });
  // const resp = await createDirectory({
  //   directoryPath: "../../src/components",
  //   dirName: "Hero",
  // });
  // const resp = deleteDirectory({
  //   directoryPath: "../../src/components/App/DocsLink",
  // });
  // const resp = insertStyles({
  //   cssPath: "../../src/components/App/Header/Header.css",
  //   styles: `.header {
  //   padding: 16px;
  // }`,
  //   addNewLine: true,
  // });
  //   const resp = updateStyles({
  //     cssPath: "../../src/components/App/Header/Header.css",
  //     target: `.header-title {
  //     color: green;
  //  }`,
  //     updatedStyles: `.header-title {
  //     padding: 16px;
  //     color: red;
  //  }`,
  //     replaceAll: false,
  //   });
  //   const resp = removeStyles({
  //     cssPath: "../../src/components/App/Header/Header.css",
  //     target: `.header-title {
  //     padding: 16px;
  //     color: red;
  //  }`,
  //     removeAll: true,
  //   });
  // const resp = ensureStyleFile({
  //   componentPath: "../../src/components/App/Header",
  //   componentName: "Header",
  //   initialStyles: `.header {
  //   padding: 16px;
  // }`,
  // });
  // const resp = renameCssClass({
  //   cssPath: "../../src/components/App/Header/Header.css",
  //   componentJSXPath: "../../src/components/App/Header/Header.jsx",
  //   oldClassName: "header",
  //   newClassName: "main-header",
  // });
  // const resp = generateClassNames({
  //   componentName: "Header",
  //   elementName: "logo",
  //   modifier: "active",
  //   useKebabCase: true,
  // });
  // const resp = syncComponentStyles({
  //   componentPath: "../../src/components/App/Header/Header.jsx",
  //   cssPath: "../../src/components/App/Header/Header.css",
  //   removeOrphanStyles: false,
  // });
  // const respo = parseCSS({
  //   //     cssCode: `header {
  //   //   display: flex;
  //   //   align-items: "center";
  //   //   justify-content: "space-between";
  //   //   padding: "16px"
  //   //  }`,
  //   cssPath: "../../src/components/App/Header/Header.css",
  // });
  // const resp = findCssSelector({
  //   ast: respo.ast,
  //   selector: "header",
  // });
  // const resp = resolveCssClassConflicts({
  //   componentName: "Header",
  //   cssPath: "../../src/components/App/Header/Header.css",
  //   componentPath: "../../src/components/App/Header/Header.jsx",
  //   genericClassNames: [
  //     "container",
  //     "wrapper",
  //     "button",
  //     "title",
  //     "card",
  //     "box",
  //     "text",
  //     "item",
  //     "content",
  //   ],
  // });
  // const resp = resolveStyleDependencies({
  //   cssPath: "../../src/components/App/Header/Header.css",
  //   availableDependencyFiles: [
  //     "../../src/styles/variables.css",
  //     "../../src/styles/typography.css",
  //   ],
  //   autoImport: true,
  // });
  // const resp = ensureLibrary({
  //   projectPath: "../../",
  //   libraryName: "axios",
  //   version: "^7.0.0",
  // });
  //   const resp = optimizeImports({
  //     code: `
  // import { useState } from 'react';
  // import reactLogo from '../../assets/react.svg';
  // import viteLogo from '/vite.svg';
  // import './App.css';
  // import Header from "./Header";
  // function App() {
  //   const [count, setCount] = useState(0);
  //   return <main data-farmon-id="cmp_app"><Header />
  //       <div>
  //         <a href="https://vite.dev" target="_blank">
  //           <img src={viteLogo} className="logo" alt="Vite logo" />
  //         </a>
  //         <a href="https://react.dev" target="_blank">
  //           <img src={reactLogo} className="logo react" alt="React logo" />
  //         </a>
  //       </div>
  //       <div className="card">
  //         <button onClick={() => setCount(count => count + 1)}>
  //           count is {count}
  //         </button>
  //         <p>
  //           Edit <code>src/App.jsx</code> and save to test HMR
  //         </p>
  //       </div>
  //       <DocsLink />
  //     </main>;
  // }
  // export default App;
  //     `,
  //   });
}

async function runRollback() {
  const latestOperation = history.getLatestOperation(OPERATION_LOG_PATH);
  if (latestOperation.type === "OPERATION") {
    const response = await history.rollbackOperation({
      operation: latestOperation,
      rollbackHandlers: rollbackHandlers,
      // logFilePath: "./.looma-logs/operations.jsonl",
    });
    console.log(response);
  } else {
    console.log("No latest operation");
  }
}

async function runActions() {
  const action = makeHeader;

  let taskOutputs = [];
  const componentRegistry = utils.createComponentRegistry({
    componentsPath: `${PROJECT_SRC}/components`,
    registry: {},
  });

  const projectDependencies = utils.getProjectDependencies({
    projectRoot: ROOT_DIR,
  });

  const appContext = {
    componentRegistry,
    projectDependencies,
    // historyManager,
    // logger,
    // eventBus,
    // planner,
  };

  for (const [key, value] of Object.entries(goldenAction)) {
    await execute.request({
      command: key,
      componentId: (value as any).componentId,
      appContext,
    });
    // const taskOutput = await executeTask({ task, payload, taskOutputs });
    // taskOutputs.push({
    //   taskId: "task-" + index,
    //   task,
    //   outputs: taskOutput,
    // });
  }
}

function trace(fn, name = fn.name) {
  return function (...args) {
    console.log(`[TRACE] ${name}`, args);
    return fn.apply(this, args);
  };
}
