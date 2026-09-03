import { resetUserStore } from "@/mocks/fixtures/users";
import { userHandlers } from "@/mocks/handlers/user";
import { server } from "@/mocks/server";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { SignUpForm } from "./sign-up-form";

function renderForm() {
  return render(
    <MemoryRouter initialEntries={["/sign-up"]}>
      <Routes>
        <Route path="/sign-up" element={<SignUpForm />} />
        <Route path="/sign-in" element={<h1>로그인 화면</h1>} />
      </Routes>
    </MemoryRouter>,
  );
}

async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByRole("textbox", { name: "이메일" }), " New@Example.com ");
  await user.type(screen.getByLabelText("비밀번호", { selector: "input" }), "Password1");
  await user.type(screen.getByLabelText("비밀번호 확인"), "Password1");
  await user.type(screen.getByRole("textbox", { name: "이름" }), " 새 사용자 ");
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => {
  resetUserStore();
  server.resetHandlers(...userHandlers);
});
afterEach(cleanup);
afterAll(() => server.close());

describe("SignUpForm", () => {
  it("associates field errors and allows only a valid form to submit", async () => {
    const user = userEvent.setup();
    renderForm();
    const submit = screen.getByRole("button", { name: "회원가입" });

    await user.type(screen.getByRole("textbox", { name: "이메일" }), "invalid");
    await user.type(screen.getByLabelText("비밀번호", { selector: "input" }), "Password!");
    await user.type(screen.getByLabelText("비밀번호 확인"), "Password2");
    await user.type(screen.getByRole("textbox", { name: "이름" }), " ");

    expect(screen.getByRole("textbox", { name: "이메일" })).toHaveAccessibleDescription(
      "올바른 이메일을 입력해주세요.",
    );
    expect(screen.getByLabelText("비밀번호", { selector: "input" })).toHaveAccessibleDescription(
      "8~24자의 영문과 숫자를 입력하세요. 비밀번호는 영문과 숫자로만 입력해주세요.",
    );
    expect(screen.getByLabelText("비밀번호 확인")).toHaveAccessibleDescription(
      "비밀번호가 일치하지 않습니다.",
    );
    expect(submit).toBeDisabled();
  });

  it("sends no confirmation or memo and returns to sign-in after 201", async () => {
    const user = userEvent.setup();
    const requests: unknown[] = [];
    server.use(
      http.post("/api/user", async ({ request }) => {
        requests.push(await request.json());
        return HttpResponse.json(
          { email: "new@example.com", name: "새 사용자", memo: "" },
          { status: 201 },
        );
      }),
    );
    renderForm();

    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(await screen.findByRole("heading", { name: "로그인 화면" })).toBeInTheDocument();
    expect(requests).toEqual([
      { email: "new@example.com", password: "Password1", name: "새 사용자" },
    ]);
  });

  it("maps only duplicate 409 to the email field", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("/api/user", () =>
        HttpResponse.json({ errorMessage: "이미 사용 중인 이메일입니다." }, { status: 409 }),
      ),
    );
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(screen.getByRole("textbox", { name: "이메일" })).toHaveAccessibleDescription(
      "이미 사용 중인 이메일입니다.",
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it.each([
    [
      "fieldless 400",
      HttpResponse.json({ errorMessage: "가입 정보를 확인해주세요." }, { status: 400 }),
    ],
    ["network", HttpResponse.error()],
    ["invalid response", HttpResponse.json({ email: "new@example.com" }, { status: 201 })],
  ])("keeps %s at the form boundary without automatic retry", async (_case, response) => {
    const user = userEvent.setup();
    let requests = 0;
    server.use(
      http.post("/api/user", () => {
        requests += 1;
        return response;
      }),
    );
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    const alert = await screen.findByRole("alert");
    expect(requests).toBe(1);
    if (_case === "fieldless 400") {
      expect(alert).toHaveTextContent("가입 정보를 확인해주세요.");
      expect(screen.queryByRole("link", { name: "로그인으로 결과 확인" })).not.toBeInTheDocument();
    } else {
      expect(alert).toHaveTextContent("계정 생성 결과를 확인할 수 없습니다.");
      expect(screen.getByRole("link", { name: "로그인으로 결과 확인" })).toHaveAttribute(
        "href",
        "/sign-in",
      );
    }
  });

  it("locks duplicate submit while the request is pending", async () => {
    const user = userEvent.setup();
    let release: () => void = () => undefined;
    let requests = 0;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.post("/api/user", async () => {
        requests += 1;
        await pending;
        return HttpResponse.json(
          { email: "new@example.com", name: "새 사용자", memo: "" },
          { status: 201 },
        );
      }),
    );
    renderForm();
    await fillValidForm(user);
    await user.click(screen.getByRole("button", { name: "회원가입" }));

    expect(screen.getByRole("button", { name: "가입 중" })).toBeDisabled();
    expect(requests).toBe(1);
    release();
    await waitFor(() =>
      expect(screen.getByRole("heading", { name: "로그인 화면" })).toBeInTheDocument(),
    );
  });
});
