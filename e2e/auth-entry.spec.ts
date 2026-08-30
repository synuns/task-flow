import { expect, test } from "@playwright/test";

test("@core @auth protects direct entry and restores a refresh-cookie session", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const refreshRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (request.url().endsWith("/api/refresh")) refreshRequests.push(request.method());
  });

  await page.goto("/task/task-1");
  await expect(page).toHaveURL(/\/sign-in$/);
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "할 일 상세" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "로그인" })).toBeVisible();
  await expect(page.getByRole("link", { name: "회원정보" })).toHaveCount(0);

  await page.getByRole("textbox", { name: "이메일" }).fill("user@example.com");
  await page.getByLabel("비밀번호").fill("Password1");
  await page.getByRole("button", { name: "로그인" }).click();

  await expect(page).toHaveURL(/\/task\/task-1$/);
  await expect(page.getByRole("heading", { name: "할 일 상세" })).toBeVisible();
  await expect(page.getByRole("link", { name: "회원정보" })).toBeVisible();
  await expect(page.getByRole("link", { name: "로그인" })).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/task\/task-1$/);
  await expect(page.getByRole("heading", { name: "할 일 상세" })).toBeVisible();
  expect(refreshRequests).toHaveLength(2);
  await page.getByRole("link", { name: "회원정보" }).click();
  await expect(page).toHaveURL(/\/user$/);
  await expect(page.getByRole("heading", { name: "회원정보" })).toBeVisible();
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  ]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("auth-entry", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});

test("@core @auth reports a credential failure in a modal and restores focus", async ({ page }) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/sign-in");
  const email = page.getByRole("textbox", { name: "이메일" });
  const password = page.getByLabel("비밀번호");
  const submit = page.getByRole("button", { name: "로그인" });
  await expect(email).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeDisabled();

  for (const navigationName of ["대시보드", "할 일", "로그인"]) {
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: navigationName })).toBeFocused();
  }
  await page.keyboard.press("Tab");
  await expect(email).toBeFocused();
  await email.fill("user@example.com");
  await page.keyboard.press("Tab");
  await expect(password).toBeFocused();
  await password.fill("Password2");
  await page.keyboard.press("Tab");
  await expect(submit).toBeFocused();
  await expect(submit).toBeEnabled();
  await page.keyboard.press("Enter");

  const dialog = page.getByRole("dialog", { name: "로그인 실패" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("alert")).toHaveText("이메일 또는 비밀번호가 올바르지 않습니다.");
  await expect(dialog.getByRole("button", { name: "닫기" })).toBeFocused();

  await dialog.getByRole("button", { name: "닫기" }).click();
  await expect(dialog).toHaveCount(0);
  await expect(submit).toBeFocused();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
    "Failed to load resource: the server responded with a status of 400 (Bad Request)",
  ]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("auth-credential-failure", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
