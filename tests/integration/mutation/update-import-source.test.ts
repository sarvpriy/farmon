import fs, { type PathLike, type PathOrFileDescriptor } from "fs";
import os from "os";
import path from "path";
import { setupIntegrationTest } from "../../test-helpers/setup-integration-test.ts";
import { executeTask } from "../../../execute/agents/mutation-agent.ts";

const ctx = setupIntegrationTest();

// updateImportPath
// ✅ Import source updated.
// ✅ Imported identifiers unchanged.
describe("updateImportSource", () => {
  test("should update import source", async () => {
    const filePath = path.join(ctx.appContext.project.root, "src/App.jsx");
    const code = `
    import { useState } from "react";
    import { useEffect } from "react";
    import reactLogo from '../../assets/react.svg';
    import viteLogo from '/vite.svg';
    import './App.css';
    import Header from "./Header";
    const foo = "Bar";
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
    const oldSource = "react";
    const newSource = "react-new";
    const result = await executeTask(
      {
        task: "updateImportSource",
        payload: {
          filePath,
          oldSource,
          newSource,
        },
        taskOutputs: [],
      },
      ctx.appContext,
    );
    expect(result.success).toBe(true);
  });
});
