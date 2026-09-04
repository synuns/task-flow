import { dashboardKeys } from "@/entities/dashboard";
import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskListPage } from ".";

const { virtualizerMock } = vi.hoisted(() => ({
  virtualizerMock: ({ count, scrollMargin = 0 }: { count: number; scrollMargin?: number }) => ({
    getTotalSize: () => count * 96,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 96,
        start: index * 96 + scrollMargin,
      })),
    measureElement: () => undefined,
    options: { scrollMargin },
  }),
}));

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: virtualizerMock,
  useWindowVirtualizer: virtualizerMock,
}));

function renderPage(client: ApiClient) {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  queryClient.setQueryData(dashboardKeys.all, { numOfRestTask: 1, numOfDoneTask: 0 });
  render(
    <MemoryRouter>
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>
          <TaskListPage />
        </ApiClientProvider>
      </QueryClientProvider>
    </MemoryRouter>,
  );
  return queryClient;
}

afterEach(cleanup);

describe("TaskListPage create journey", () => {
  it("creates a task and refetches the list before showing the server ID", async () => {
    const user = userEvent.setup();
    const requests: Array<{ method: string; body?: string }> = [];
    let created = false;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        requests.push({ method: init.method ?? "GET", body: String(init.body ?? "") || undefined });
        let body: unknown;
        if (init.method === "POST") {
          created = true;
          body = {
            id: "task-server-9",
            title: "새 할 일",
            memo: "메모",
            status: "TODO",
            registerDatetime: "2026-09-03T10:00:00.000Z",
          };
        } else {
          body = {
            data: created
              ? [{ id: "task-server-9", title: "새 할 일", memo: "메모", status: "TODO" }]
              : [],
            hasNext: false,
          };
        }
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const queryClient = renderPage(client);

    await screen.findByText("등록된 할 일이 없습니다.");
    await user.click(screen.getByRole("button", { name: "새 할 일" }));
    const title = screen.getByRole("textbox", { name: "제목" });
    expect(title).toHaveFocus();
    await user.type(title, "  새 할 일  ");
    await user.type(screen.getByRole("textbox", { name: "메모" }), "메모");
    await user.click(screen.getByRole("button", { name: "생성" }));

    expect(await screen.findByRole("link", { name: "새 할 일 할 일 메모" })).toHaveAttribute(
      "href",
      "/task/task-server-9",
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(requests).toEqual([
      { method: "GET" },
      { method: "POST", body: JSON.stringify({ title: "새 할 일", memo: "메모" }) },
      { method: "GET" },
    ]);
    expect(queryClient.getQueryState(dashboardKeys.all)?.isInvalidated).toBe(true);
  });

  it("blocks duplicate POST until an outcome-unknown list check finishes", async () => {
    const user = userEvent.setup();
    let postCount = 0;
    let getCount = 0;
    let releaseCheck: () => void = () => undefined;
    const checkPending = new Promise<void>((resolve) => {
      releaseCheck = resolve;
    });
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (init.method === "POST") {
          postCount += 1;
          throw { kind: "network", message: "네트워크 요청에 실패했습니다." };
        }
        getCount += 1;
        if (getCount === 2) await checkPending;
        const body: unknown = { data: [], hasNext: false };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    renderPage(client);

    await screen.findByText("등록된 할 일이 없습니다.");
    await user.click(screen.getByRole("button", { name: "새 할 일" }));
    await user.type(screen.getByRole("textbox", { name: "제목" }), "새 할 일");
    await user.click(screen.getByRole("button", { name: "생성" }));

    await waitFor(() => expect(screen.getByRole("button", { name: "확인 중" })).toBeDisabled());
    expect(postCount).toBe(1);
    releaseCheck();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "생성 결과를 확인할 수 없습니다. 목록을 확인한 뒤 다시 시도할 수 있습니다.",
    );
    expect(screen.getByRole("button", { name: "다시 생성" })).toBeEnabled();
    expect(postCount).toBe(1);
  });

  it("keeps the dialog open for validation, server error, and cancellation", async () => {
    const user = userEvent.setup();
    let postCount = 0;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        _isSuccess: (value: unknown) => value is T,
      ) => {
        if (init.method === "POST") {
          postCount += 1;
          throw { kind: "http", status: 400, message: "제목을 확인해주세요." };
        }
        return { data: [], hasNext: false } as T;
      },
    };
    renderPage(client);

    await screen.findByText("등록된 할 일이 없습니다.");
    await user.click(screen.getByRole("button", { name: "새 할 일" }));
    await user.click(screen.getByRole("button", { name: "생성" }));
    expect(screen.getByText("제목을 입력해주세요.")).toBeInTheDocument();
    expect(postCount).toBe(0);

    await user.type(screen.getByRole("textbox", { name: "제목" }), "할 일");
    await user.click(screen.getByRole("button", { name: "생성" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("제목을 확인해주세요.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "새 할 일" })).toHaveFocus();
  });
});
