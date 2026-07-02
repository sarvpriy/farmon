import { useState } from "react";
import { useEffect } from "react";

function useCustom() {
  return [];
}
function App() {
  const [count, setCount] = useState(0);
  useEffect(() => {}, []);
  useCustom();
  return (
    <main data-farmon-id="cmp_app">
      <p>Header</p>
      <div className="card">
        <button onClick={() => setCount((count) => count + 1)}>
          count is {count}
        </button>
        <p>
          Edit <code>src/App.jsx</code> and save to test HMR
        </p>
      </div>
    </main>
  );
}
export default App;
