// @vitest-environment node

import { readFileSync } from "node:fs";
import playwrightConfig from "../../playwright.config";
import vitestConfig from "../../vitest.config";
import { describe, expect, it } from "vitest";

const rootTsConfig: unknown = JSON.parse(
  readFileSync(new URL("../../tsconfig.json", import.meta.url), "utf8"),
);

describe("local verification configuration", () => {
  it("starts a fresh server for every Playwright run", () => {
    expect(playwrightConfig.webServer).toMatchObject({ reuseExistingServer: false });
  });

  it("rejects focused Playwright and Vitest tests", () => {
    expect(playwrightConfig).toMatchObject({ forbidOnly: true });
    expect(vitestConfig).toMatchObject({ test: { allowOnly: false } });
  });

  it("exposes the source alias to root-level tooling", () => {
    expect(rootTsConfig).toMatchObject({
      compilerOptions: { baseUrl: ".", paths: { "@/*": ["./src/*"] } },
    });
  });
});
