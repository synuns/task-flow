import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";

async function bootstrap() {
  const { startWorker } = await import("@/mocks/browser");
  await startWorker();

  const rootElement = document.getElementById("root");
  if (!rootElement) {
    throw new Error("React root element is missing");
  }

  createRoot(rootElement).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
}

void bootstrap();
