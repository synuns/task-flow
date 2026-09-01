import { expect, test } from "@playwright/test";
import { prepareAuthenticatedPage } from "./authenticated-fixture";

test("@architecture resolves every route and starts the production mock worker", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  const anonymousPage = await page.context().newPage();
  await anonymousPage.goto("/sign-in");
  await expect(anonymousPage.getByRole("heading", { name: "로그인" })).toBeVisible();
  await anonymousPage.close();

  await prepareAuthenticatedPage(page);
  for (const [path, heading] of [
    ["/", "대시보드"],
    ["/task", "할 일"],
    ["/task/task-1", "첫 번째 할 일"],
    ["/user", "회원정보"],
  ] as const) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "대시보드", exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "할 일", exact: true })).toBeVisible();
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
