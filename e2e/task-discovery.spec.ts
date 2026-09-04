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
  const mountedBeforeScroll = await page.locator("[data-task-row]").count();
  expect(mountedBeforeScroll).toBeGreaterThan(0);
  expect(mountedBeforeScroll).toBeLessThan(10);

  const list = page.getByRole("region", { name: "할 일 목록" });
  for (let pageNumber = 2; pageNumber <= 15; pageNumber += 1) {
    if (!taskRequests.some((request) => request.page === String(pageNumber))) {
      await list.evaluate((element) => {
        element.scrollTop = element.scrollHeight;
        element.dispatchEvent(new Event("scroll"));
      });
    }
    await expect
      .poll(() => taskRequests.map((request) => request.page))
      .toContain(String(pageNumber));
  }
  await expect(page.getByText("모든 할 일을 불러왔습니다.")).toBeVisible();
  expect(await page.locator("[data-task-row]").count()).toBeLessThan(10);
  expect(taskRequests.map((request) => request.page)).toEqual(
    Array.from({ length: 15 }, (_, index) => String(index + 1)),
  );
  expect(taskRequests.every((request) => request.authorization?.startsWith("Bearer "))).toBe(true);
  expect(signInRequests).toEqual([]);

  await list.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    element.dispatchEvent(new Event("scroll"));
  });
  await expect(page.getByRole("link", { name: /추가 할 일 30/ })).toBeVisible();
  const listScreenshot = await page.screenshot({ fullPage: true });
  await page.getByRole("link", { name: /추가 할 일 30/ }).click();
  await expect(page).toHaveURL(/\/task\/task-30$/);
  await expect(page.getByRole("heading", { name: "추가 할 일 30" })).toBeVisible();
  expect(consoleErrors).toEqual([]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("task-discovery", {
    body: listScreenshot,
    contentType: "image/png",
  });
});
