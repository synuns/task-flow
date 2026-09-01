import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DashboardSummary } from ".";

function wrapper(client: ApiClient) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return function Providers({ children }: PropsWithChildren) {
    return (
      <QueryClientProvider client={queryClient}>
        <ApiClientProvider client={client}>{children}</ApiClientProvider>
      </QueryClientProvider>
    );
  };
}

afterEach(cleanup);

describe("DashboardSummary", () => {
  it("distinguishes loading from the metric result", async () => {
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const body: unknown = { numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 };
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        await pending;
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<DashboardSummary />, { wrapper: wrapper(client) });

    expect(screen.getByRole("status")).toHaveTextContent("업무 현황을 불러오고 있습니다.");
    release();

    expect(await screen.findByText("전체 할 일")).toBeInTheDocument();
    expect(screen.getByText("전체 할 일").nextElementSibling).toHaveTextContent("3");
    expect(screen.getByText("남은 할 일").nextElementSibling).toHaveTextContent("2");
    expect(screen.getByText("완료한 일").nextElementSibling).toHaveTextContent("1");
    expect(screen.getByRole("progressbar", { name: "업무 완료율" })).toHaveAttribute(
      "aria-valuenow",
      "33",
    );
  });

  it("explains the zero-task state without dividing by zero", async () => {
    const body: unknown = { numOfTask: 0, numOfRestTask: 0, numOfDoneTask: 0 };
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<DashboardSummary />, { wrapper: wrapper(client) });

    expect(await screen.findByText("아직 등록된 할 일이 없습니다.")).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "업무 완료율" })).toHaveAttribute(
      "aria-valuenow",
      "0",
    );
  });

  it("offers an explicit retry after a recoverable error", async () => {
    const user = userEvent.setup();
    const request = vi
      .fn()
      .mockRejectedValueOnce({ kind: "network", message: "네트워크 요청에 실패했습니다." })
      .mockResolvedValueOnce({ numOfTask: 3, numOfRestTask: 2, numOfDoneTask: 1 });
    render(<DashboardSummary />, {
      wrapper: wrapper({ request: request as ApiClient["request"] }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 요청에 실패했습니다.");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("전체 할 일")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
