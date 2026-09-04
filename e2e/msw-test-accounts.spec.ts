import { expect, type Page, test } from "@playwright/test";

async function signIn(page: Page, email: string): Promise<void> {
  await page.goto("/sign-in");
  await page.getByRole("textbox", { name: "이메일" }).fill(email);
  await page.getByLabel("비밀번호").fill("Password1");
  await page.getByRole("button", { name: "로그인" }).click();
  await expect(page).toHaveURL(/\/$/);
}

test.describe("@msw-test-accounts", () => {
  test("빈 목록 계정은 dashboard와 task 목록의 empty state를 보여준다", async ({ page }) => {
    await signIn(page, "empty@example.com");

    await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "0",
    );
    await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "0",
    );
    await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText(
      "0",
    );
    await page.getByRole("link", { name: "할 일", exact: true }).click();
    await expect(page.getByText("등록된 할 일이 없습니다.")).toBeVisible();
  });

  test("오류 계정은 모든 보호 조회 route의 복구 UI를 보여준다", async ({ page }) => {
    await signIn(page, "error@example.com");

    await expect(page.getByRole("alert")).toContainText("업무 현황을 불러오지 못했습니다.");
    await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();

    await page.goto("/user");
    await expect(page.getByRole("alert")).toContainText("회원정보를 불러오지 못했습니다.");
    await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();

    await page.goto("/task");
    await expect(page.getByRole("alert")).toContainText("할 일을 불러오지 못했습니다.");
    await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();

    await page.goto("/task/task-1");
    await expect(page.getByRole("alert")).toContainText("할 일 상세를 불러오지 못했습니다.");
    await expect(page.getByRole("button", { name: "다시 불러오기" })).toBeVisible();
  });
});
