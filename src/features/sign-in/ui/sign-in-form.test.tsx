import { resetAuthFixture, startAuthSession } from "@/mocks/fixtures/auth";
import { authHandlers } from "@/mocks/handlers/auth";
import { server } from "@/mocks/server";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { SignInForm } from "./sign-in-form";

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetAuthFixture();
  server.resetHandlers(...authHandlers);
});
afterEach(cleanup);
afterAll(() => server.close());

describe("SignInForm", () => {
  it("keeps submit disabled and associates validation messages with each input", async () => {
    const user = userEvent.setup();
    const { container } = render(<SignInForm onAuthenticated={vi.fn()} />);

    const email = screen.getByRole("textbox", { name: "이메일" });
    const password = screen.getByLabelText("비밀번호");
    const submit = screen.getByRole("button", { name: "로그인" });
    expect(container.querySelector('[data-slot="card"]')).toBeInTheDocument();
    expect(email).toHaveAttribute("data-slot", "input");
    expect(submit).toHaveAttribute("data-slot", "button");
    expect(submit).toBeDisabled();
    expect(password).toHaveAccessibleDescription("8~24자의 영문과 숫자를 입력하세요.");

    await user.type(email, "invalid");
    await user.type(password, "Password!");

    expect(email).toHaveAccessibleDescription("올바른 이메일을 입력해주세요.");
    expect(password).toHaveAccessibleDescription(
      "8~24자의 영문과 숫자를 입력하세요. 비밀번호는 영문과 숫자로만 입력해주세요.",
    );
    expect(submit).toBeDisabled();
  });

  it("shows required messages after entered values are cleared", async () => {
    const user = userEvent.setup();
    render(<SignInForm onAuthenticated={vi.fn()} />);

    const email = screen.getByRole("textbox", { name: "이메일" });
    const password = screen.getByLabelText("비밀번호");
    await user.type(email, "x");
    await user.clear(email);
    await user.type(password, "x");
    await user.clear(password);

    expect(email).toHaveAccessibleDescription("이메일을 입력해주세요.");
    expect(password).toHaveAccessibleDescription(
      "8~24자의 영문과 숫자를 입력하세요. 비밀번호는 8자 이상이어야 합니다.",
    );
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
  });

  it.each([
    ["7-character", "Pass123", "비밀번호는 8자 이상이어야 합니다."],
    ["25-character", "A".repeat(25), "비밀번호는 24자 이하여야 합니다."],
    ["non-ASCII", "Password한", "비밀번호는 영문과 숫자로만 입력해주세요."],
  ])("shows the %s password error and keeps submit disabled", async (_case, value, message) => {
    const user = userEvent.setup();
    render(<SignInForm onAuthenticated={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: "이메일" }), "user@example.com");
    const password = screen.getByLabelText("비밀번호");
    await user.type(password, value);

    expect(password).toHaveAccessibleDescription(`8~24자의 영문과 숫자를 입력하세요. ${message}`);
    expect(screen.getByRole("button", { name: "로그인" })).toBeDisabled();
  });

  it("shows a server error dialog and restores focus when it closes", async () => {
    const user = userEvent.setup();
    render(<SignInForm onAuthenticated={vi.fn()} />);

    await user.type(screen.getByRole("textbox", { name: "이메일" }), "wrong@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password1");
    const submit = screen.getByRole("button", { name: "로그인" });
    await user.click(submit);

    const dialog = await screen.findByRole("dialog", { name: "로그인 실패" });
    expect(dialog).toHaveTextContent("이메일 또는 비밀번호가 올바르지 않습니다.");
    await user.click(screen.getByRole("button", { name: "닫기" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(submit).toHaveFocus();
  });

  it("submits once and returns the token pair", async () => {
    const user = userEvent.setup();
    const onAuthenticated = vi.fn();
    let release: () => void = () => undefined;
    let requestCount = 0;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("/api/sign-in", async () => {
        requestCount += 1;
        await pending;
        return HttpResponse.json(startAuthSession());
      }),
    );
    render(<SignInForm onAuthenticated={onAuthenticated} />);

    await user.type(screen.getByRole("textbox", { name: "이메일" }), "user@example.com");
    await user.type(screen.getByLabelText("비밀번호"), "Password1");
    const submit = screen.getByRole("button", { name: "로그인" });
    expect(submit).toBeEnabled();
    await user.click(submit);
    const pendingSubmit = screen.getByRole("button", { name: "로그인 중" });
    expect(pendingSubmit).toBeDisabled();
    await user.click(pendingSubmit);
    release();

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(requestCount).toBe(1);
    expect(onAuthenticated.mock.calls[0]?.[0]).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });
});
