import { expect, test } from "@playwright/test";
import { prepareAuthenticatedPage } from "./authenticated-fixture";

test("@scaffold loads the React root and local Pretendard without browser errors", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await prepareAuthenticatedPage(page);
  await page.goto("/");

  await expect(page.locator("#root")).toHaveCount(1);
  const workerResponse = await page.request.get("/mockServiceWorker.js");

  expect(workerResponse.ok()).toBe(true);
  expect(workerResponse.headers()["content-type"]).toContain("javascript");

  const fontLoaded = await page.evaluate(async () => {
    const loadedFonts = await document.fonts.load('16px "Pretendard"');
    return loadedFonts.length > 0;
  });
  const fontResources = await page.evaluate(() =>
    performance.getEntriesByType("resource").map((entry) => entry.name),
  );

  expect(fontLoaded).toBe(true);
  expect(fontResources.some((url) => url.endsWith("/fonts/PretendardVariable.woff2"))).toBe(true);
  await expect(page.locator("html")).toHaveCSS("font-family", /Pretendard/);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("scaffold-root", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
