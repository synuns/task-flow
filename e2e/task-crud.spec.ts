import { expect, type Page, test } from "@playwright/test";
import { prepareAuthenticatedPage } from "./authenticated-fixture";

async function openTaskFromList(page: Page, id: string, title: RegExp): Promise<void> {
  const terminal = page.getByText("모든 할 일을 불러왔습니다.");
  const taskLink = page.getByRole("link", { name: title });
  await expect
    .poll(
      async () => {
        await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
        return taskLink.count();
      },
      { timeout: 20_000 },
    )
    .toBe(1);

  await expect(terminal).toBeVisible();
  await expect(taskLink).toHaveAttribute("href", `/task/${id}`);
  await taskLink.click();
}

test.describe("@task-crud", () => {
  test("@core Task CRUD 성공 흐름과 소유 상태를 유지한다", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const patchBodies: unknown[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));
    page.on("request", (request) => {
      if (
        new URL(request.url()).pathname.startsWith("/api/task/") &&
        request.method() === "PATCH"
      ) {
        patchBodies.push(request.postDataJSON());
      }
    });

    await prepareAuthenticatedPage(page);
    await page.goto("/task");
    await page.getByRole("button", { name: "새 할 일" }).click();
    const title = page.getByRole("textbox", { name: "제목" });
    await expect(title).toBeFocused();
    await title.fill("  CRUD 여정 할 일  ");
    await page.getByRole("textbox", { name: "메모" }).fill("생성 위치를 가정하지 않음");
    const createResponsePromise = page.waitForResponse(
      (response) =>
        new URL(response.url()).pathname === "/api/task" && response.request().method() === "POST",
    );
    await page.getByRole("button", { name: "생성" }).click();
    const createResponse = await createResponsePromise;
    expect(createResponse.status()).toBe(201);
    const created = (await createResponse.json()) as { id: string };

    await openTaskFromList(page, created.id, /CRUD 여정 할 일/);
    await expect(page).toHaveURL(new RegExp(`/task/${created.id}$`));
    await expect(page.getByRole("button", { name: "할 일", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await page.getByRole("button", { name: "제목 수정" }).click();
    const editTitle = page.getByRole("textbox", { name: "제목" });
    await expect(editTitle).toBeFocused();
    await editTitle.fill("수정한 CRUD 여정");
    await page.getByRole("button", { name: "제목 수정 완료" }).click();
    await expect(page.getByRole("heading", { name: "수정한 CRUD 여정" })).toBeVisible();

    await page.getByRole("button", { name: "진행 중", exact: true }).click();
    await expect(page.getByRole("button", { name: "진행 중", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByRole("button", { name: "완료", exact: true }).click();
    await expect(page.getByRole("button", { name: "완료", exact: true })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(patchBodies).toEqual([
      { title: "수정한 CRUD 여정" },
      { status: "IN_PROGRESS" },
      { status: "DONE" },
    ]);

    await page.getByRole("link", { name: "대시보드" }).click();
    await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "31",
    );
    await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "20",
    );
    await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText(
      "11",
    );

    await page.getByRole("link", { name: "할 일", exact: true }).click();
    await openTaskFromList(page, created.id, /수정한 CRUD 여정/);
    await page.getByRole("button", { name: "할 일 삭제" }).click();
    const confirmId = page.getByRole("textbox", { name: "할 일 ID" });
    await confirmId.fill(`${created.id} `);
    await expect(page.getByRole("button", { name: "삭제 확인" })).toBeDisabled();
    await confirmId.fill(created.id);
    await page.getByRole("button", { name: "삭제 확인" }).click();

    await expect(page).toHaveURL(/\/task$/);
    await expect(page.getByText("수정한 CRUD 여정")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
    await test.info().attach("task-crud-success", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });

  test("@core 상태 변경 실패는 상세와 현황 값을 보존한다", async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    await page.addInitScript(() => {
      const originalFetch = window.fetch.bind(window);
      let failed = false;
      window.fetch = async (input, init) => {
        const request = input instanceof Request ? input : new Request(input, init);
        if (
          !failed &&
          request.method === "PATCH" &&
          new URL(request.url).pathname === "/api/task/task-1"
        ) {
          failed = true;
          return new Response(JSON.stringify({ errorMessage: "상태 변경을 거절했습니다." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
          });
        }
        return originalFetch(input, init);
      };
    });
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await prepareAuthenticatedPage(page);
    await page.goto("/task/task-1");
    const todo = page.getByRole("button", { name: "할 일", exact: true });
    await expect(todo).toHaveAttribute("aria-pressed", "true");
    await page.getByRole("button", { name: "완료", exact: true }).click();

    await expect(page.getByRole("alert")).toContainText("상태 변경을 거절했습니다.");
    await expect(todo).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "완료", exact: true })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    await page.getByRole("link", { name: "대시보드" }).click();
    await expect(page.getByText("전체 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "30",
    );
    await expect(page.getByText("남은 할 일").locator("xpath=following-sibling::dd")).toHaveText(
      "20",
    );
    await expect(page.getByText("완료한 일").locator("xpath=following-sibling::dd")).toHaveText(
      "10",
    );
    expect(pageErrors).toEqual([]);
    expect(consoleErrors.filter((message) => !message.includes("500"))).toEqual([]);
    await test.info().attach("task-crud-status-failure", {
      body: await page.screenshot({ fullPage: true }),
      contentType: "image/png",
    });
  });
});
