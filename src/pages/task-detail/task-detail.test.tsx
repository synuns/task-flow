import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
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
            </Routes>
          </ApiClientProvider>
        </QueryClientProvider>
      </MemoryRouter>
    );
  }
  return render(<TaskDetailPage />, { wrapper: Providers });
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
});
