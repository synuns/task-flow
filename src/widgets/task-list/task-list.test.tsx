import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type PropsWithChildren, StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskList } from ".";

vi.mock("@tanstack/react-virtual", () => ({
  useVirtualizer: ({ count }: { count: number }) => ({
    getTotalSize: () => count * 96,
    getVirtualItems: () =>
      Array.from({ length: count }, (_, index) => ({
        index,
        key: index,
        size: 96,
        start: index * 96,
      })),
    measureElement: () => undefined,
  }),
}));

function wrapper(client: ApiClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Providers({ children }: PropsWithChildren) {
    return (
      <StrictMode>
        <MemoryRouter>
          <QueryClientProvider client={queryClient}>
            <ApiClientProvider client={client}>{children}</ApiClientProvider>
          </QueryClientProvider>
        </MemoryRouter>
      </StrictMode>
    );
  };
}

afterEach(cleanup);

describe("TaskList", () => {
  it("requests each page once and stops after the terminal page", async () => {
    let releaseFirst: () => void = () => undefined;
    let releaseSecond: () => void = () => undefined;
    const firstPending = new Promise<void>((resolve) => {
      releaseFirst = resolve;
    });
    const secondPending = new Promise<void>((resolve) => {
      releaseSecond = resolve;
    });
    const requestedPages: number[] = [];
    const requestSignals: Array<AbortSignal | null | undefined> = [];
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        requestedPages.push(page);
        requestSignals.push(init.signal);
        const waitFor = page === 1 ? firstPending : secondPending;
        await Promise.race([
          waitFor,
          new Promise<void>((_, reject) => {
            init.signal?.addEventListener(
              "abort",
              () => reject(new DOMException("aborted", "AbortError")),
              { once: true },
            );
          }),
        ]);
        const body: unknown =
          page === 1
            ? {
                data: [
                  { id: "task-1", title: "첫 번째 할 일", memo: "첫 메모", status: "TODO" },
                  { id: "task-2", title: "두 번째 할 일", memo: "둘째 메모", status: "TODO" },
                ],
                hasNext: true,
              }
            : {
                data: [{ id: "task-3", title: "완료한 일", memo: "셋째 메모", status: "DONE" }],
                hasNext: false,
              };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(screen.getByRole("status")).toHaveTextContent("할 일을 불러오고 있습니다.");
    releaseFirst();
    expect(await screen.findByText("첫 번째 할 일")).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "할 일 목록" })).toHaveStyle({ height: "96px" });
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ minHeight: "96px" });
    await waitFor(() => expect(requestedPages).toEqual([1, 2]));
    expect(screen.getByRole("button", { name: "다음 페이지 불러오는 중" })).toBeDisabled();
    releaseSecond();

    expect(await screen.findByText("완료한 일")).toBeInTheDocument();
    expect(screen.getByText("모든 할 일을 불러왔습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
    expect(requestedPages).toEqual([1, 2]);
    expect(requestSignals).toEqual([undefined, undefined]);
  });

  it("shows a distinct empty state without requesting another page", async () => {
    const requestedPages: number[] = [];
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        requestedPages.push(Number(new URL(String(input)).searchParams.get("page")));
        const body: unknown = { data: [], hasNext: false };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(await screen.findByText("등록된 할 일이 없습니다.")).toBeInTheDocument();
    expect(requestedPages).toEqual([1]);
  });

  it("offers an explicit retry after the initial request fails", async () => {
    const user = userEvent.setup();
    let attempts = 0;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        attempts += 1;
        if (attempts === 1) {
          throw { kind: "network", message: "네트워크 요청에 실패했습니다." };
        }
        const body: unknown = { data: [], hasNext: false };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 요청에 실패했습니다.");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("등록된 할 일이 없습니다.")).toBeInTheDocument();
    expect(attempts).toBe(2);
  });
});
