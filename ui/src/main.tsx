import React from "react";
import { createRoot } from "react-dom/client";
import "@ui/index.css";
import App from "@ui/components/App/App.tsx";

createRoot(document.getElementById("looma-root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
