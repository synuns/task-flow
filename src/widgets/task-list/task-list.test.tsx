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
  it.each([
    "{ArrowDown}",
    "{ArrowUp}",
    "{End}",
    "{Home}",
    "{PageDown}",
    "{PageUp}",
    " ", // Shift+Space has the same KeyboardEvent.key value.
  ])("%s from a task card hands focus to the scroll region", async (key) => {
    const user = userEvent.setup();
    const client: ApiClient = {
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
    render(<TaskList />, { wrapper: wrapper(client) });

    const card = await screen.findByRole("link", { name: "첫 번째 할 일 첫 메모 상태 할 일" });
    const region = screen.getByRole("region", { name: "할 일 목록" });
    card.focus();
    await user.keyboard(key);

    expect(region).toHaveFocus();
    expect(region).toHaveAttribute("tabindex", "0");
    expect(region).toHaveClass(
      "outline-none",
      "focus-visible:ring-2",
      "focus-visible:ring-ring/50",
    );
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
    expect(screen.getByRole("region", { name: "할 일 목록" })).toHaveClass("min-h-0", "flex-1");
    expect(screen.getAllByRole("listitem")[0]).toHaveStyle({ minHeight: "96px" });
    await waitFor(() => expect(requestedPages).toEqual([1, 2]));
    expect(screen.getByRole("button", { name: "다음 페이지 불러오는 중" })).toBeDisabled();
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
    const client: ApiClient = {
      request: async <T,>(
        input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const page = Number(new URL(String(input)).searchParams.get("page"));
        if (page === 2) throw { kind: "network", message: "다음 페이지 요청에 실패했습니다." };
        const body: unknown = {
          data: [{ id: "task-1", title: "첫 번째 할 일", memo: "첫 메모", status: "TODO" }],
          hasNext: true,
        };
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<TaskList />, { wrapper: wrapper(client) });

    expect(await screen.findByRole("alert")).toHaveTextContent("다음 페이지 요청에 실패했습니다.");
    expect(screen.getByRole("button", { name: "다시 불러오기" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /다음 페이지/ })).not.toBeInTheDocument();
  });
});
