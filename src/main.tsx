import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "@/app";
import { bootstrap, BootstrapFailure } from "@/bootstrap";

const rootElement = document.getElementById("root");
if (!rootElement) {
  throw new Error("React root element is missing");
}
const root = createRoot(rootElement);

void bootstrap(
  async () => {
    const { startWorker } = await import("@/mocks/browser");
    await startWorker();
  },
  () =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  () => root.render(<BootstrapFailure onRetry={() => globalThis.location.reload()} />),
);
