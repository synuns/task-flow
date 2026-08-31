import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        requests.push(String(input));
        const body: unknown = {
          title: "첫 번째 할 일",
          memo: "삭제 검증 대상",
          registerDatetime: "2026-08-30T09:00:00.000Z",
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };

    renderPage(client);

    expect(await screen.findByRole("heading", { name: "첫 번째 할 일" })).toBeInTheDocument();
    expect(screen.getByText("삭제 검증 대상")).toBeInTheDocument();
    expect(screen.getByText("2026-08-30T09:00:00.000Z")).toBeInTheDocument();
    expect(requests).toEqual([`${globalThis.location.origin}/api/task/task-1`]);
  });

  it("separates a missing task and offers a list recovery action", async () => {
    const client: ApiClient = {
      request: async () => {
        throw { kind: "http", status: 404, message: "할 일을 찾을 수 없습니다." };
      },
    };

    renderPage(client, "/task/missing");

    expect(await screen.findByRole("alert")).toHaveTextContent("할 일을 찾을 수 없습니다.");
    expect(screen.getByRole("link", { name: "할 일 목록으로 이동" })).toHaveAttribute(
      "href",
      "/task",
    );
  });

  it("evicts protected snapshots and navigates only after explicit delete success", async () => {
    const user = userEvent.setup();
    const methods: string[] = [];
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ): Promise<T> => {
        methods.push(init.method ?? "GET");
        const body: unknown =
          init.method === "DELETE"
            ? { success: true }
            : {
                title: "첫 번째 할 일",
                memo: "삭제 검증 대상",
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
    expect(screen.getByRole("heading", { name: "첫 번째 할 일" })).toBeInTheDocument();
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
