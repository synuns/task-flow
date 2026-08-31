import playwrightConfig from "../../playwright.config.ts?raw";
import vitestConfig from "../../vitest.config.ts?raw";
import { describe, expect, it } from "vitest";

describe("local verification configuration", () => {
  it("rejects focused Playwright and Vitest tests", () => {
    expect(playwrightConfig).toMatch(/forbidOnly:\s*true/);
    expect(vitestConfig).toMatch(/allowOnly:\s*false/);
  });
});
