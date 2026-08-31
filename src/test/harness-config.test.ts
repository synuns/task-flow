// @vitest-environment node

import { expect, it } from "vitest";
import config from "../../playwright.config";

it("starts a fresh server for every Playwright run", () => {
  expect(config.webServer).toMatchObject({ reuseExistingServer: false });
});
