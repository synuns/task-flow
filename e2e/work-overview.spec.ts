import { expect, test } from "@playwright/test";

test("@core @work shows authenticated dashboard, profile, and persistent navigation", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const protectedRequests: Array<{ path: string; authorization?: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/dashboard" || url.pathname === "/api/user") {
      protectedRequests.push({
        path: url.pathname,
        authorization: request.headers().authorization,
      });
    }
  });

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  const setupStatus = await page.evaluate(async () => {
    const response = await fetch("/api/sign-in", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "user@example.com", password: "Password1" }),
    });
    return response.status;
  });
  expect(setupStatus).toBe(200);
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  ]);
  consoleErrors.length = 0;

  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText("3");
  await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText("2");
  await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText("1");
  await expect(page.getByRole("link", { name: "대시보드", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "회원정보", exact: true }).click();
  await expect(page).toHaveURL(/\/user$/);
  await expect(page.getByText("김담당")).toBeVisible();
  await expect(page.getByText("오늘도 차근차근")).toBeVisible();
  await expect(page.getByRole("link", { name: "회원정보", exact: true })).toHaveAttribute(
    "aria-current",
    "page",
  );

  await page.getByRole("link", { name: "할 일", exact: true }).click();
  await expect(page).toHaveURL(/\/task$/);
  await expect(page.getByRole("heading", { name: "할 일", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "대시보드", exact: true }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();

  const apiRequests = protectedRequests.map(({ path, authorization }) => ({
    path,
    bearer: authorization?.startsWith("Bearer ") ?? false,
  }));
  expect(apiRequests).toEqual([
    { path: "/api/dashboard", bearer: true },
    { path: "/api/user", bearer: true },
    { path: "/api/dashboard", bearer: true },
  ]);
  expect(
    await page.evaluate(() => getComputedStyle(document.documentElement).fontFamily),
  ).toContain("Pretendard");

  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByRole("link", { name: "대시보드", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "할 일", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "회원정보", exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("work-overview", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
