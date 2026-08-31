// @vitest-environment node

import playwrightConfig from "../../playwright.config";
import vitestConfig from "../../vitest.config";
import { describe, expect, it } from "vitest";

describe("local verification configuration", () => {
  it("starts a fresh server for every Playwright run", () => {
    expect(playwrightConfig.webServer).toMatchObject({ reuseExistingServer: false });
  });

  it("rejects focused Playwright and Vitest tests", () => {
    expect(playwrightConfig).toMatchObject({ forbidOnly: true });
    expect(vitestConfig).toMatchObject({ test: { allowOnly: false } });
  });
});
