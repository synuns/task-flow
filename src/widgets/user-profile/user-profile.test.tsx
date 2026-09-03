import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { PropsWithChildren } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { userKeys } from "@/entities/user";
import { type ApiClient, ApiClientProvider } from "@/shared/api";
import { UserProfile } from ".";

function wrapper(
  client: ApiClient,
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
) {
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
    const body: unknown = {
      email: "user@example.com",
      name: "김담당",
      memo: "오늘도 차근차근",
    };
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
      .mockResolvedValueOnce({
        email: "user@example.com",
        name: "김담당",
        memo: "오늘도 차근차근",
      });
    render(<UserProfile />, {
      wrapper: wrapper({ request: request as ApiClient["request"] }),
    });

    expect(await screen.findByRole("alert")).toHaveTextContent("네트워크 요청에 실패했습니다.");
    await user.click(screen.getByRole("button", { name: "다시 불러오기" }));

    expect(await screen.findByText("김담당")).toBeInTheDocument();
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("edits one profile field at a time and cancels without changing the value", async () => {
    const user = userEvent.setup();
    const profile = {
      email: "user@example.com",
      name: "김담당",
      memo: "오늘도 차근차근",
    };
    const client: ApiClient = {
      request: async <T,>(
        _input: RequestInfo | URL,
        _init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (!isSuccess(profile)) throw new Error("invalid fixture");
        return profile;
      },
    };
    render(<UserProfile />, { wrapper: wrapper(client) });

    expect(await screen.findByText("user@example.com")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "이메일" })).not.toBeInTheDocument();

    const editName = screen.getByRole("button", { name: "이름 수정" });
    await user.click(editName);

    const nameInput = screen.getByRole("textbox", { name: "이름" });
    expect(nameInput).toHaveFocus();
    expect(screen.getByRole("button", { name: "메모 수정" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "이름 수정 완료" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이름 수정 취소" })).toBeInTheDocument();

    await user.clear(nameInput);
    await user.type(nameInput, "임시 이름");
    await user.click(screen.getByRole("button", { name: "이름 수정 취소" }));

    expect(screen.getByText("김담당")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "이름 수정" })).toHaveFocus();
  });

  it("keeps cached profile unchanged until PATCH succeeds", async () => {
    const user = userEvent.setup();
    const initial = {
      email: "user@example.com",
      name: "김담당",
      memo: "오늘도 차근차근",
    };
    const updated = { ...initial, name: "김수정" };
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const request = vi.fn(
      async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        const body = init.method === "PATCH" ? updated : initial;
        if (init.method === "PATCH") await pending;
        if (!isSuccess(body)) throw new Error("invalid fixture");
        return body;
      },
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<UserProfile />, {
      wrapper: wrapper({ request: request as ApiClient["request"] }, queryClient),
    });

    await user.click(await screen.findByRole("button", { name: "이름 수정" }));
    await user.clear(screen.getByRole("textbox", { name: "이름" }));
    await user.type(screen.getByRole("textbox", { name: "이름" }), "김수정");
    await user.click(screen.getByRole("button", { name: "이름 수정 완료" }));

    expect(queryClient.getQueryData(userKeys.all)).toEqual(initial);
    expect(screen.getByRole("button", { name: "이름 수정 완료" })).toBeDisabled();
    expect(request).toHaveBeenLastCalledWith(
      expect.any(URL),
      expect.objectContaining({ method: "PATCH", body: JSON.stringify({ name: "김수정" }) }),
      expect.any(Function),
    );

    release();

    expect(await screen.findByText("김수정")).toBeInTheDocument();
    expect(queryClient.getQueryData(userKeys.all)).toEqual(updated);
  });

  it("shows a fieldless PATCH error on the edited row", async () => {
    const user = userEvent.setup();
    const profile = {
      email: "user@example.com",
      name: "김담당",
      memo: "오늘도 차근차근",
    };
    const request = vi.fn(
      async <T,>(
        _input: RequestInfo | URL,
        init: RequestInit,
        isSuccess: (value: unknown) => value is T,
      ) => {
        if (init.method === "PATCH") {
          throw { kind: "http", status: 400, message: "수정 정보를 확인해주세요." };
        }
        if (!isSuccess(profile)) throw new Error("invalid fixture");
        return profile;
      },
    );
    render(<UserProfile />, {
      wrapper: wrapper({ request: request as ApiClient["request"] }),
    });

    await user.click(await screen.findByRole("button", { name: "메모 수정" }));
    const memoInput = screen.getByRole("textbox", { name: "메모" });
    await user.clear(memoInput);
    await user.type(memoInput, "바꿀 메모");
    await user.click(screen.getByRole("button", { name: "메모 수정 완료" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("수정 정보를 확인해주세요.");
    expect(memoInput).toHaveValue("바꿀 메모");
    expect(memoInput).not.toHaveAttribute("aria-invalid", "true");
  });
});
