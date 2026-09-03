import { expect, test } from "@playwright/test";

test.describe("@user-crud", () => {
  test("@core user CRUD 성공 뒤 보호 경계를 닫는다", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const createBodies: unknown[] = [];
    const updateBodies: unknown[] = [];
    const deleteBodies: unknown[] = [];
    const signOutRequests: { method: string; body: string | null; bearer: boolean }[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const path = new URL(request.url()).pathname;
      if (path === "/api/sign-out") {
        signOutRequests.push({
          method: request.method(),
          body: request.postData(),
          bearer: /^Bearer \S+$/.test(request.headers().authorization ?? ""),
        });
      }
      if (path !== "/api/user") return;
      if (request.method() === "POST") createBodies.push(request.postDataJSON());
      if (request.method() === "PATCH") updateBodies.push(request.postDataJSON());
      if (request.method() === "DELETE") deleteBodies.push(request.postDataJSON());
    });

    await page.goto("/sign-in");
    await page.getByRole("link", { name: "회원가입", exact: true }).click();
    await expect(page).toHaveURL(/\/sign-up$/);

    const email = page.getByRole("textbox", { name: "이메일" });
    await email.fill("잘못된 이메일");
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByText("올바른 이메일을 입력해주세요.")).toBeVisible();

    await email.fill("journey@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("Password1");
    const confirmation = page.getByLabel("비밀번호 확인", { exact: true });
    await confirmation.fill("Password2");
    await expect(page.getByText("비밀번호가 일치하지 않습니다.")).toBeVisible();
    await confirmation.fill("Password1");
    await page.getByRole("textbox", { name: "이름" }).fill("여정사용자");
    await page.getByRole("button", { name: "회원가입" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    expect(createBodies).toEqual([
      { email: "journey@example.com", password: "Password1", name: "여정사용자" },
    ]);

    await page.getByRole("textbox", { name: "이메일" }).fill("journey@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("Password1");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/$/);

    await page.getByRole("link", { name: "회원정보", exact: true }).click();
    await expect(page.getByText("journey@example.com")).toBeVisible();
    await expect(page.getByText("여정사용자")).toBeVisible();
    await expect(page.getByText("—")).toBeVisible();

    await page.getByRole("button", { name: "이름 수정" }).click();
    const name = page.getByRole("textbox", { name: "이름" });
    await expect(name).toBeFocused();
    await expect(page.getByRole("button", { name: "메모 수정" })).toBeDisabled();
    await name.fill("수정사용자");
    await page.getByRole("button", { name: "이름 수정 완료" }).click();
    await expect(page.getByText("수정사용자")).toBeVisible();
    expect(updateBodies).toEqual([{ name: "수정사용자" }]);

    await page.getByRole("button", { name: "로그아웃" }).click();
    const signOutDialog = page.getByRole("alertdialog", { name: "로그아웃하시겠어요?" });
    await expect(signOutDialog.getByRole("button", { name: "취소" })).toBeFocused();
    await signOutDialog.getByRole("button", { name: "취소" }).click();
    await expect(page.getByRole("button", { name: "로그아웃" })).toBeFocused();
    await page.getByRole("button", { name: "로그아웃" }).click();
    await signOutDialog.getByRole("button", { name: "로그아웃" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    expect(signOutRequests).toEqual([{ method: "POST", body: null, bearer: true }]);
    await page.reload();
    await expect(page).toHaveURL(/\/sign-in$/);
    await page.goto("/user");
    await expect(page).toHaveURL(/\/sign-in$/);

    await page.getByRole("textbox", { name: "이메일" }).fill("journey@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("Password1");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/user$/);
    await expect(page.getByText("수정사용자")).toBeVisible();

    await page.getByRole("button", { name: "회원 탈퇴" }).click();
    const password = page.getByLabel("현재 비밀번호");
    await expect(password).toBeFocused();
    await password.fill("Password1");
    await page.getByRole("button", { name: "탈퇴 확인" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    expect(deleteBodies).toEqual([{ password: "Password1" }]);
    await page.goto("/user");
    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByRole("link", { name: "회원정보" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((message) => !message.includes("401"))).toEqual([]);

    await test.info().attach("user-crud-success", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test("@core 잘못된 탈퇴 비밀번호는 상태를 보존한다", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const deleteBodies: unknown[] = [];
    const deleteStatuses: number[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      const url = new URL(request.url());
      if (url.pathname === "/api/user" && request.method() === "DELETE") {
        deleteBodies.push(request.postDataJSON());
      }
    });
    page.on("response", (response) => {
      const request = response.request();
      if (new URL(response.url()).pathname === "/api/user" && request.method() === "DELETE") {
        deleteStatuses.push(response.status());
      }
    });

    await page.goto("/sign-in");
    await page.getByRole("textbox", { name: "이메일" }).fill("user@example.com");
    await page.getByLabel("비밀번호", { exact: true }).fill("Password1");
    await page.getByRole("button", { name: "로그인" }).click();
    await expect(page).toHaveURL(/\/$/);
    await page.getByRole("link", { name: "회원정보", exact: true }).click();
    await expect(page.getByText("김담당")).toBeVisible();

    await page.getByRole("button", { name: "회원 탈퇴" }).click();
    await page.getByLabel("현재 비밀번호").fill("Wrong123");
    await page.getByRole("button", { name: "탈퇴 확인" }).click();

    const dialog = page.getByRole("alertdialog", { name: "회원 탈퇴" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("alert")).toHaveText("현재 비밀번호가 올바르지 않습니다.");
    await expect(page.getByText("김담당")).toBeVisible();
    expect(deleteBodies).toEqual([{ password: "Wrong123" }]);
    expect(deleteStatuses).toEqual([400]);

    await dialog.getByRole("button", { name: "취소" }).click();
    await page.getByRole("link", { name: "할 일", exact: true }).click();
    await expect(page.getByText("첫 번째 할 일")).toBeVisible();
    await expect(page.getByText("두 번째 할 일")).toBeVisible();
    await page.getByRole("link", { name: "회원정보", exact: true }).click();
    await expect(page.getByText("김담당")).toBeVisible();
    await expect(page.getByRole("link", { name: "로그인" })).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    expect(
      consoleErrors.filter((message) => !message.includes("401") && !message.includes("400")),
    ).toEqual([]);

    await test.info().attach("user-crud-wrong-password", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
