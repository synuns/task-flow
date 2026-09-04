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
    await expect
      .poll(async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return taskRequests.map((request) => request.page);
      })
      .toContain(String(pageNumber));
  }
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  await expect(page.getByText("모든 할 일을 불러왔습니다.")).toBeVisible();
  const scrollState = await list.evaluate((element) => ({
    clientHeight: element.clientHeight,
    overflowY: getComputedStyle(element).overflowY,
    scrollHeight: element.scrollHeight,
    terminalInside: element.contains(
      Array.from(element.querySelectorAll("p")).find(
        (node) => node.textContent === "모든 할 일을 불러왔습니다.",
      ) ?? null,
    ),
    windowScrollY: window.scrollY,
  }));
  expect(scrollState.overflowY).toBe("visible");
  expect(scrollState.scrollHeight).toBe(scrollState.clientHeight);
  expect(scrollState.terminalInside).toBe(true);
  expect(scrollState.windowScrollY).toBeGreaterThan(0);
  expect(
    await page.evaluate(() => document.documentElement.scrollHeight > window.innerHeight),
  ).toBe(true);
  expect(await page.locator("[data-task-row]").count()).toBeLessThan(10);
  expect(taskRequests.map((request) => request.page)).toEqual(
    Array.from({ length: 15 }, (_, index) => String(index + 1)),
  );
  expect(taskRequests.every((request) => request.authorization?.startsWith("Bearer "))).toBe(true);
  expect(signInRequests).toEqual([]);

  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
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
