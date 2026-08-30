import { setupWorker } from "msw/browser";

const worker = setupWorker();

export function startWorker() {
  return worker.start({ onUnhandledRequest: "bypass" });
}
