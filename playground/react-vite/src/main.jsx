import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import { init } from "farmon";

if (import.meta.env.DEV) {
  init({
    serverUrl: "http://localhost:3001", // that is only for iframe to load farmon ui
  });
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
