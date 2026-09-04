import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, describe, expect, it } from "vitest";
import { TaskDetailPage } from ".";

function renderPage(client: ApiClient, path = "/task/task-1") {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Providers({ children }: PropsWithChildren) {
    return (
      <MemoryRouter initialEntries={[path]}>
        <QueryClientProvider client={queryClient}>
          <ApiClientProvider client={client}>
            <Routes>
              <Route path="task/:id" element={children} />
              <Route path="task" element={<h1>목록 도착</h1>} />
            </Routes>
          </ApiClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return { ...render(<TaskDetailPage />, { wrapper: Providers }), queryClient };
}

function seedProtectedSnapshots(queryClient: QueryClient) {
  queryClient.setQueryData(["tasks"], { pages: [{ data: [{ id: "task-1" }] }] });
  queryClient.setQueryData(["dashboard"], { numOfTask: 3 });
  queryClient.setQueryData(["unrelated"], { keep: true });
}

afterEach(cleanup);

describe("TaskDetailPage", () => {
  it("renders the detail fields returned for the route ID", async () => {
    const requests: string[] = [];
    const requestSignals: Array<AbortSignal | null | undefined> = [];
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        requests.push(String(input));
        requestSignals.push(init.signal);
        const body: unknown = {
          title: "첫 번째 할 일",
          memo: "삭제 검증 대상",
          status: "TODO",
          registerDatetime: "2026-08-30T09:00:00.000Z",
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };

    renderPage(client);

    expect(await screen.findByRole("heading", { name: "첫 번째 할 일" })).toBeInTheDocument();
    expect(screen.getByText("삭제 검증 대상").closest('[data-slot="card"]')).toBeInTheDocument();
    expect(
      screen.getByText(
        new Intl.DateTimeFormat("ko-KR", {
          dateStyle: "long",
          timeStyle: "short",
          timeZone: "Asia/Seoul",
        }).format(new Date("2026-08-30T09:00:00.000Z")),
      ),
    ).toBeInTheDocument();
    expect(requests).toEqual([`${globalThis.location.origin}/api/task/task-1`]);
    expect(requestSignals).toHaveLength(1);
    expect(requestSignals[0]).toBeInstanceOf(AbortSignal);
  });

  it("keeps long contract strings inside the detail layout", async () => {
    const title = "A".repeat(500);
    const memo = "B".repeat(500);
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        const body: unknown = {
          title,
          memo,
          status: "TODO",
          registerDatetime: "2026-08-30T09:00:00.000Z",
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };

    renderPage(client);

    expect(await screen.findByRole("heading", { name: title })).toHaveClass(
      "min-w-0",
      "[overflow-wrap:anywhere]",
    );
    expect(screen.getByText(memo)).toHaveClass("min-w-0", "[overflow-wrap:anywhere]");
  });

  it("edits one task field at a time and cancels back to the server value", async () => {
    const user = userEvent.setup();
    const detail = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "TODO",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    } as const;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (!isSuccess(detail)) throw new Error("invalid fixture");
        return detail;
      },
    };
    renderPage(client);

    const editTitle = await screen.findByRole("button", { name: "제목 수정" });
    await user.click(editTitle);
    const input = screen.getByRole("textbox", { name: "제목" });
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "메모 수정" })).toBeDisabled();
    await user.clear(input);
    await user.type(input, "임시 제목");
    await user.click(screen.getByRole("button", { name: "제목 수정 취소" }));

    expect(screen.getByRole("heading", { name: detail.title })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "제목 수정" })).toHaveFocus();
    expect(screen.queryByRole("button", { name: "등록 일시 수정" })).not.toBeInTheDocument();
  });

  it("keeps caches unchanged until one-field PATCH succeeds", async () => {
    const user = userEvent.setup();
    const initial = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "TODO",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    } as const;
    const updated = { ...initial, title: "수정한 할 일" };
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests: RequestInit[] = [];
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        requests.push(init);
        const body: unknown = init.method === "PATCH" ? updated : initial;
        if (init.method === "PATCH") await pending;
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const { queryClient } = renderPage(client);
    queryClient.setQueryData(["tasks"], { pages: [{ data: [{ id: "task-1" }] }] });

    await user.click(await screen.findByRole("button", { name: "제목 수정" }));
    await user.clear(screen.getByRole("textbox", { name: "제목" }));
    await user.type(screen.getByRole("textbox", { name: "제목" }), "  수정한 할 일  ");
    await user.click(screen.getByRole("button", { name: "제목 수정 완료" }));

    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(initial);
    expect(screen.getByRole("button", { name: "제목 수정 완료" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "진행 중" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "할 일 삭제" })).toBeDisabled();
    expect(requests.at(-1)).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ title: "수정한 할 일" }),
    });
    release();

    expect(await screen.findByRole("heading", { name: updated.title })).toBeInTheDocument();
    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(updated);
    await waitFor(() => expect(queryClient.getQueryState(["tasks"])?.isInvalidated).toBe(true));
  });

  it("preserves the draft and server value after a fieldless PATCH error", async () => {
    const user = userEvent.setup();
    const initial = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "TODO",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    } as const;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (init.method === "PATCH") {
          throw { kind: "http", status: 400, message: "수정 값을 확인해주세요." };
        }
        if (!isSuccess(initial)) throw new Error("invalid fixture");
        return initial;
      },
    };
    const { queryClient } = renderPage(client);

    await user.click(await screen.findByRole("button", { name: "메모 수정" }));
    await user.clear(screen.getByRole("textbox", { name: "메모" }));
    await user.type(screen.getByRole("textbox", { name: "메모" }), "임시 메모");
    await user.click(screen.getByRole("button", { name: "메모 수정 완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("수정 값을 확인해주세요.");
    expect(screen.getByRole("textbox", { name: "메모" })).toHaveValue("임시 메모");
    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(initial);
  });

  it("changes status and related caches only after PATCH succeeds", async () => {
    const user = userEvent.setup();
    const initial = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "TODO",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    } as const;
    const updated = { ...initial, status: "IN_PROGRESS" as const };
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const requests: RequestInit[] = [];
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        requests.push(init);
        const body: unknown = init.method === "PATCH" ? updated : initial;
        if (init.method === "PATCH") await pending;
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const { queryClient } = renderPage(client);
    queryClient.setQueryData(["tasks"], { pages: [{ data: [{ id: "task-1" }] }] });
    queryClient.setQueryData(["dashboard"], { numOfTask: 1, numOfRestTask: 1, numOfDoneTask: 0 });

    const todo = await screen.findByRole("button", { name: "할 일" });
    const inProgress = screen.getByRole("button", { name: "진행 중" });
    expect(todo).toHaveAttribute("aria-pressed", "true");
    await user.click(inProgress);

    expect(todo).toHaveAttribute("aria-pressed", "true");
    expect(inProgress).toHaveAttribute("aria-pressed", "false");
    expect(inProgress).toBeDisabled();
    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(initial);
    expect(screen.getByRole("button", { name: "제목 수정" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "할 일 삭제" })).toBeDisabled();
    expect(requests.at(-1)).toMatchObject({
      method: "PATCH",
      body: JSON.stringify({ status: "IN_PROGRESS" }),
    });
    release();

    await waitFor(() => expect(inProgress).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("button", { name: "제목 수정" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "할 일 삭제" })).toBeEnabled();
    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(updated);
    expect(queryClient.getQueryState(["tasks"])?.isInvalidated).toBe(true);
    expect(queryClient.getQueryState(["dashboard"])?.isInvalidated).toBe(true);
  });

  it("keeps the prior status and dashboard after PATCH fails", async () => {
    const user = userEvent.setup();
    const initial = {
      title: "첫 번째 할 일",
      memo: "삭제 검증 대상",
      status: "TODO",
      registerDatetime: "2026-08-30T09:00:00.000Z",
    } as const;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (init.method === "PATCH") {
          throw { kind: "http", status: 400, message: "상태를 수정하지 못했습니다." };
        }
        if (!isSuccess(initial)) throw new Error("invalid fixture");
        return initial;
      },
    };
    const { queryClient } = renderPage(client);
    queryClient.setQueryData(["dashboard"], { numOfTask: 1, numOfRestTask: 1, numOfDoneTask: 0 });

    await user.click(await screen.findByRole("button", { name: "완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("상태를 수정하지 못했습니다.");
    expect(screen.getByRole("button", { name: "할 일" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "완료" })).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: "제목 수정" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "할 일 삭제" })).toBeEnabled();
    expect(queryClient.getQueryData(["task", "task-1"])).toEqual(initial);
    expect(queryClient.getQueryState(["dashboard"])?.isInvalidated).toBe(false);
  });

  it("separates a missing task and offers a list recovery action", async () => {
    const client: ApiClient = {
      request: async () => {
        throw { kind: "http", status: 404, message: "할 일을 찾을 수 없습니다." };
      },
    };

    renderPage(client, "/task/missing");

    await screen.findByRole("alert");
    expect(screen.getAllByText("할 일을 찾을 수 없습니다.")).toHaveLength(1);
    expect(screen.getByRole("link", { name: "할 일 목록으로 이동" })).toHaveAttribute(
      "href",
      "/task",
    );
  });

  it("evicts protected snapshots and navigates only after explicit delete success", async () => {
    const user = userEvent.setup();
    const methods: string[] = [];
    let releaseDelete: () => void = () => undefined;
    const deletePending = new Promise<void>((resolve) => {
      releaseDelete = resolve;
    });
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        methods.push(init.method ?? "GET");
        if (init.method === "DELETE") await deletePending;
        const body: unknown =
          init.method === "DELETE"
            ? { success: true }
            : {
                title: "첫 번째 할 일",
                memo: "삭제 검증 대상",
                status: "TODO",
                registerDatetime: "2026-08-30T09:00:00.000Z",
              };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const { queryClient } = renderPage(client);
    seedProtectedSnapshots(queryClient);

    await screen.findByRole("heading", { name: "첫 번째 할 일" });
    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(screen.getByRole("button", { name: "제목 수정", hidden: true })).toBeDisabled();
    expect(screen.getByRole("button", { name: "진행 중", hidden: true })).toBeDisabled();
    releaseDelete();

    expect(await screen.findByRole("heading", { name: "목록 도착" })).toBeInTheDocument();
    expect(methods).toEqual(["GET", "DELETE"]);
    expect(queryClient.getQueriesData({ queryKey: ["tasks"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["task"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["dashboard"] })).toEqual([]);
    expect(queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
  });

  it("evicts stale snapshots but stays on detail when delete returns 404", async () => {
    const user = userEvent.setup();
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        if (init.method === "DELETE") {
          throw { kind: "http", status: 404, message: "할 일을 찾을 수 없습니다." };
        }
        const body: unknown = {
          title: "첫 번째 할 일",
          memo: "삭제 검증 대상",
          status: "TODO",
          registerDatetime: "2026-08-30T09:00:00.000Z",
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const { queryClient } = renderPage(client);
    seedProtectedSnapshots(queryClient);

    await screen.findByRole("heading", { name: "첫 번째 할 일" });
    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("할 일을 찾을 수 없습니다.");
    expect(
      screen.getByRole("heading", { name: "첫 번째 할 일", hidden: true }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "목록 도착" })).not.toBeInTheDocument();
    expect(queryClient.getQueriesData({ queryKey: ["tasks"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["task"] })).toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["dashboard"] })).toEqual([]);
  });

  it("keeps route and caches when reconciliation proves the task still exists", async () => {
    const user = userEvent.setup();
    let calls = 0;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        calls += 1;
        if (init.method === "DELETE") {
          throw { kind: "network", message: "네트워크 요청에 실패했습니다." };
        }
        const body: unknown = {
          title: "첫 번째 할 일",
          memo: "삭제 검증 대상",
          status: "TODO",
          registerDatetime: "2026-08-30T09:00:00.000Z",
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    const { queryClient } = renderPage(client);
    seedProtectedSnapshots(queryClient);

    await screen.findByRole("heading", { name: "첫 번째 할 일" });
    await user.click(screen.getByRole("button", { name: "할 일 삭제" }));
    await user.type(screen.getByRole("textbox", { name: "할 일 ID" }), "task-1");
    await user.click(screen.getByRole("button", { name: "삭제 확인" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("삭제를 다시 시도할 수 있습니다.");
    expect(calls).toBe(3);
    expect(queryClient.getQueriesData({ queryKey: ["tasks"] })).not.toEqual([]);
    expect(queryClient.getQueriesData({ queryKey: ["dashboard"] })).not.toEqual([]);
    expect(screen.queryByRole("heading", { name: "목록 도착" })).not.toBeInTheDocument();
  });
});
