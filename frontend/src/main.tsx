import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Suspense } from "react";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("❌ Root element #root not found in index.html");
}

createRoot(rootElement).render(
  <Suspense fallback={<div className="p-10 text-center">Loading App...</div>}>
    <App />
  </Suspense>
);
