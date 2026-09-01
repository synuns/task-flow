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
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("/api/sign-in", async () => {
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
    expect(submit).toBeDisabled();
    await user.click(submit);
    release();

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledTimes(1));
    expect(onAuthenticated.mock.calls[0]?.[0]).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
    });
  });
});
