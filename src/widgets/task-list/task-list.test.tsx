import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { type PropsWithChildren, StrictMode } from "react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TaskList } from ".";

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

function wrapper(
  client: ApiClient,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
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
  it("uses the document as the only scroll surface", async () => {
    const successClient: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const body: unknown = {
          data: [{ id: "task-1", title: "첫 번째 할 일", memo: "첫 메모", status: "TODO" }],
          hasNext: false,
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(successClient) });

    const region = await screen.findByRole("region", { name: "할 일 목록" });
    expect(region).not.toHaveClass("overflow-auto");
    expect(region).not.toHaveAttribute("tabindex");
    expect(region).toContainElement(screen.getByText("모든 할 일을 불러왔습니다."));
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
  });

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
    const { container } = render(<TaskList />, { wrapper: wrapper(client) });

    expect(screen.getByRole("status")).toHaveTextContent("할 일을 불러오고 있습니다.");
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    releaseFirst();
    expect(await screen.findByText("첫 번째 할 일")).toBeInTheDocument();
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ minHeight: "96px" });
    await waitFor(() => expect(requestedPages).toEqual([1, 2]));
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("다음 할 일을 불러오고 있습니다.");
    releaseSecond();

    expect(await screen.findByText("완료한 일")).toBeInTheDocument();
    expect(screen.getByText("모든 할 일을 불러왔습니다.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
    expect(requestedPages).toEqual([1, 2]);
    expect(requestSignals).toHaveLength(2);
    expect(requestSignals.every((signal) => signal instanceof AbortSignal)).toBe(true);
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

  it("continues after an empty intermediate page when hasNext is true", async () => {
    const requestedPages: number[] = [];
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        requestedPages.push(page);
        const body: unknown =
          page === 1
            ? { data: [], hasNext: true }
            : {
                data: [
                  { id: "task-2", title: "두 번째 페이지 할 일", memo: "메모", status: "TODO" },
                ],
                hasNext: false,
              };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(await screen.findByText("두 번째 페이지 할 일")).toBeInTheDocument();
    expect(requestedPages).toEqual([1, 2]);
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

  it("replaces the next-page action with retry after a page request fails", async () => {
    const user = userEvent.setup();
    let pageTwoAttempts = 0;
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        if (page === 2) {
          pageTwoAttempts += 1;
          if (pageTwoAttempts === 1) {
            throw { kind: "network", message: "다음 페이지 요청에 실패했습니다." };
          }
        }
        const body: unknown =
          page === 1
            ? {
                data: [{ id: "task-1", title: "첫 번째 할 일", memo: "첫 메모", status: "TODO" }],
                hasNext: true,
              }
            : {
                data: [{ id: "task-2", title: "두 번째 할 일", memo: "둘째 메모", status: "TODO" }],
                hasNext: false,
              };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(await screen.findByRole("alert")).toHaveTextContent("다음 페이지 요청에 실패했습니다.");
    expect(screen.getByText("첫 번째 할 일")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("두 번째 할 일")).toBeInTheDocument();
    expect(screen.getByText("첫 번째 할 일")).toBeInTheDocument();
    expect(pageTwoAttempts).toBe(2);
  });

  it("retries a failed refetch while retaining the current tasks", async () => {
    const user = userEvent.setup();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    let attempts = 0;
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        attempts += 1;
        if (attempts === 2) {
          throw { kind: "network", message: "목록 새로고침에 실패했습니다." };
        }
        const body: unknown = {
          data: [
            {
              id: "task-1",
              title: attempts === 1 ? "기존 할 일" : "새로고침한 할 일",
              memo: "메모",
              status: "TODO",
            },
          ],
          hasNext: false,
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client, queryClient) });

    expect(await screen.findByText("기존 할 일")).toBeInTheDocument();
    await act(() => queryClient.refetchQueries({ queryKey: ["tasks"] }));

    expect(await screen.findByRole("alert")).toHaveTextContent("목록 새로고침에 실패했습니다.");
    expect(screen.getByText("기존 할 일")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("새로고침한 할 일")).toBeInTheDocument();
    expect(attempts).toBe(3);
  });
});
