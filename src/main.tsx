import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("React root element is missing");
}

createRoot(rootElement).render(<StrictMode />);
