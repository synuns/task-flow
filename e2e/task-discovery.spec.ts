import { expect, test } from "@playwright/test";
import { prepareAuthenticatedPage } from "./authenticated-fixture";

test("@core @task-discovery loads terminal pages into a bounded virtual list", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 400 });
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const signInRequests: string[] = [];
  const taskRequests: Array<{ page: string | null; authorization?: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/api/sign-in") signInRequests.push(request.method());
    if (url.pathname === "/api/task" && request.method() === "GET") {
      taskRequests.push({
        page: url.searchParams.get("page"),
        authorization: request.headers().authorization,
      });
    }
  });

  await prepareAuthenticatedPage(page);
  await page.goto("/task");
  await expect(page).toHaveURL(/\/task$/);
  await expect(page.getByRole("heading", { name: "할 일", exact: true })).toBeVisible();
  await expect(page.getByText("첫 번째 할 일")).toBeVisible();
  await expect(page.getByText("삭제 검증 대상")).toBeVisible();
  await expect(page.getByText("모든 할 일을 불러왔습니다.")).toBeVisible();
  expect(taskRequests.map((request) => request.page)).toEqual(["1", "2"]);
  const mountedBeforeScroll = await page.locator("[data-task-row]").count();
  expect(mountedBeforeScroll).toBeGreaterThan(0);
  expect(mountedBeforeScroll).toBeLessThan(3);

  await page.getByRole("region", { name: "할 일 목록" }).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await page.getByRole("region", { name: "할 일 목록" }).evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(page.getByText("완료한 일")).toBeVisible();
  expect(await page.locator("[data-task-row]").count()).toBeLessThan(3);
  expect(taskRequests.map((request) => request.page)).toEqual(["1", "2"]);
  expect(taskRequests.every((request) => request.authorization?.startsWith("Bearer "))).toBe(true);
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);
  expect(signInRequests).toEqual([]);

  const listScreenshot = await page.screenshot({ fullPage: true });
  await page.getByRole("link", { name: /완료한 일/ }).click();
  await expect(page).toHaveURL(/\/task\/task-3$/);
  await expect(page.getByRole("heading", { name: "완료한 일" })).toBeVisible();

  await test.info().attach("task-discovery", {
    body: listScreenshot,
    contentType: "image/png",
  });
});
