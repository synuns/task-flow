// @vitest-environment node

import { readFileSync } from "node:fs";
import playwrightConfig from "../../playwright.config";
import vitestConfig from "../../vitest.config";
import { describe, expect, it, vi } from "vitest";

const rootTsConfig: unknown = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
);
const packageDocument = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf8"),
) as { devDependencies: Record<string, string> };
const installedPlaywright = JSON.parse(
  readFileSync(
    new URL("../../node_modules/@playwright/test/package.json", import.meta.url),
    "utf8",
  ),
) as { version: string };

describe("local verification configuration", () => {
  it("starts a fresh server for every Playwright run", () => {
    expect(playwrightConfig.webServer).toMatchObject({ reuseExistingServer: false });
  });

  it("rejects focused Playwright and Vitest tests", () => {
    expect(playwrightConfig).toMatchObject({ forbidOnly: true });
    expect(vitestConfig).toMatchObject({ test: { allowOnly: false } });
  });

  it("uses the exact installed Playwright version declared by the project", () => {
    expect(installedPlaywright.version).toBe(packageDocument.devDependencies["@playwright/test"]);
    const [major, minor] = installedPlaywright.version.split(".").map(Number);
    expect(major > 1 || (major === 1 && minor >= 61)).toBe(true);
  });

  it("fails flaky tests after one diagnostic retry locally and in CI", async () => {
    const originalCi = process.env.CI;
    try {
      delete process.env.CI;
      vi.resetModules();
      const local = (await import("../../playwright.config")).default;
      process.env.CI = "1";
      vi.resetModules();
      const ci = (await import("../../playwright.config")).default;

      const verdict = (config: typeof local) => ({
        retries: config.retries,
        failOnFlakyTests: config.failOnFlakyTests,
      });
      expect(verdict(local)).toEqual({ retries: 1, failOnFlakyTests: true });
      expect(verdict(ci)).toEqual(verdict(local));
    } finally {
      if (originalCi === undefined) delete process.env.CI;
      else process.env.CI = originalCi;
      vi.resetModules();
    }
  });

  it("exposes the source alias to root-level tooling", () => {
    expect(rootTsConfig).toMatchObject({
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } },
    });
  });
});
