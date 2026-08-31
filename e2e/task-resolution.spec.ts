import { expect, test } from "@playwright/test";

test("@core @task-resolution deletes only after exact confirmation and refreshes server state", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const deleteRequests: Array<{ authorization?: string }> = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/task/task-1" && request.method() === "DELETE") {
      deleteRequests.push({ authorization: request.headers().authorization });
    }
  });

  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "로그인" })).toBeVisible();
  expect(
    await page.evaluate(async () => {
      const response = await fetch("/api/sign-in", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "user@example.com", password: "Password1" }),
      });
      return response.status;
    }),
  ).toBe(200);
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 401 (Unauthorized)",
  ]);
  consoleErrors.length = 0;

  await page.reload();
  await expect(page).toHaveURL(/\/$/);
  await page.goto("/task/task-1");
  await expect(page.getByRole("heading", { name: "첫 번째 할 일" })).toBeVisible();
  await expect(page.getByText("삭제 검증 대상")).toBeVisible();
  await expect(page.getByText("2026-08-30T09:00:00.000Z")).toBeVisible();

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
  await expect(page.getByRole("alert")).toHaveText("할 일을 찾을 수 없습니다.");
  await expect(page.getByRole("link", { name: "할 일 목록으로 이동" })).toBeVisible();
  await page.getByRole("link", { name: "대시보드" }).click();
  await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText("2");
  await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText("1");
  await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText("1");
  expect(consoleErrors).toEqual([
    "Failed to load resource: the server responded with a status of 404 (Not Found)",
  ]);
  expect(pageErrors).toEqual([]);

  await test.info().attach("task-resolution", {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
});
