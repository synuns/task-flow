import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") window.scrollTo = () => undefined;

// Node 25 exposes an unconfigured experimental accessor that MSW probes on import.
const nodeMajor = Number(process.versions.node.split(".")[0]);
const localStorageDescriptor = Object.getOwnPropertyDescriptor(globalThis, "localStorage");
if (nodeMajor >= 25 && localStorageDescriptor?.configurable && localStorageDescriptor.get) {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: undefined });
}
