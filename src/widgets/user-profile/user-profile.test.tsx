import { ApiClientProvider, type ApiClient } from "@/shared/api";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { UserProfile } from ".";

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

describe("UserProfile", () => {
  it("distinguishes loading from the profile result", async () => {
    let requestSignal: AbortSignal | null | undefined;
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const body: unknown = { name: "김담당", memo: "오늘도 차근차근" };
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        requestSignal = init.signal;
        await pending;
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    };
    render(<UserProfile />, { wrapper: wrapper(client) });

    expect(screen.getByRole("status")).toHaveTextContent("회원정보를 불러오고 있습니다.");
    release();

    const name = await screen.findByText("김담당");
    expect(name.closest('[data-slot="card"]')).toBeInTheDocument();
    expect(screen.getByText("오늘도 차근차근")).toBeInTheDocument();
    expect(requestSignal).toBeInstanceOf(AbortSignal);
  });

  it("offers an explicit retry after a recoverable error", async () => {
    const user = userEvent.setup();
    const request = vi
      .fn()
      .mockRejectedValueOnce({ kind: "network", message: "네트워크 요청에 실패했습니다." })
      .mockResolvedValueOnce({ name: "김담당", memo: "오늘도 차근차근" });
    render(<UserProfile />, {
      wrapper: wrapper({ request: request as ApiClient["request"] }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 요청에 실패했습니다.");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("김담당")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });
});
