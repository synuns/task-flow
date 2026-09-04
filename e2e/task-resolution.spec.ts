import { expect, test } from "@playwright/test";
import { prepareAuthenticatedPage } from "./authenticated-fixture";

test("@core @task-resolution deletes only after exact confirmation and refreshes server state", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const signInRequests: string[] = [];
  const deleteRequests: Array<{ authorization?: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    const path = new URL(request.url()).pathname;
    if (path === "/api/sign-in") signInRequests.push(request.method());
    if (path === "/api/task/task-1" && request.method() === "DELETE") {
      deleteRequests.push({ authorization: request.headers().authorization });
    }
  });

  await prepareAuthenticatedPage(page);
  await page.goto("/task/task-1");
  await expect(page.getByRole("heading", { name: "첫 번째 할 일" })).toBeVisible();
  await expect(page.getByText("삭제 검증 대상")).toBeVisible();
  const registeredAt = page.locator("time");
  await expect(registeredAt).toHaveAttribute("datetime", "2026-08-30T09:00:00.000Z");
  await expect(registeredAt).toContainText("2026년 8월 30일");

  await page.getByRole("button", { name: "할 일 삭제" }).click();
  const input = page.getByRole("textbox", { name: "할 일 ID" });
  const submit = page.getByRole("button", { name: "삭제 확인" });
  for (const value of ["task-1 ", "TASK-1", "wrong"]) {
    await input.fill(value);
    await expect(submit).toBeDisabled();
  }
  expect(deleteRequests).toEqual([]);

  await input.fill("task-1");
  await expect(submit).toBeEnabled();
  await submit.click();

  await expect(page).toHaveURL(/\/task$/);
  expect(deleteRequests).toHaveLength(1);
  expect(deleteRequests[0]?.authorization?.startsWith("Bearer ")).toBe(true);
  await expect(page.getByText("첫 번째 할 일")).toHaveCount(0);
  await expect(page.getByText("두 번째 할 일")).toBeVisible();

  await page.goto("/task/task-1");
  await expect(page.getByText("할 일을 찾을 수 없습니다.", { exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "할 일 목록으로 이동" })).toBeVisible();
  await page.getByRole("link", { name: "대시보드" }).click();
  await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText(
    "29",
  );
  await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText(
    "19",
  );
  await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText("10");
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 404 (Not Found)",
  ]);
  expect(pageErrors).toEqual([]);
  expect(signInRequests).toEqual([]);

  await test.info().attach("task-resolution", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
