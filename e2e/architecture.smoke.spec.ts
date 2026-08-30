import { expect, test } from "@playwright/test";

test("@architecture resolves every route and starts the DEV mock worker", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const [path, heading] of [
    ["/", "대시보드"],
    ["/sign-in", "로그인"],
    ["/task", "할 일"],
    ["/task/task-1", "할 일 상세"],
    ["/user", "회원정보"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    await expect(page.getByRole("link", { name: "대시보드" })).toBeVisible();
    await expect(page.getByRole("link", { name: "할 일" })).toBeVisible();
  }

  const workerUrl = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.active?.scriptURL ?? "";
  });

  expect(workerUrl).toContain("/mockServiceWorker.js");
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  await test.info().attach("architecture-routes", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
