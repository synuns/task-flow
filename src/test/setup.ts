import "@testing-library/jest-dom/vitest";

// Node 25 exposes an unconfigured experimental accessor that MSW probes on import.
Object.defineProperty(globalThis, "localStorage", { configurable: true, value: undefined });
