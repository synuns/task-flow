import { CircleUserRound, LayoutDashboard, ListTodo, LogIn } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export type AuthAction = { kind: "sign-in"; to: "/sign-in" } | { kind: "profile"; to: "/user" };

export function AppShell({ authAction }: { authAction: AuthAction }) {
  const AuthIcon = authAction.kind === "sign-in" ? LogIn : CircleUserRound;
  const authLabel = authAction.kind === "sign-in" ? "로그인" : "회원정보";
  return (
    <>
      <header>
        <nav aria-label="주요 메뉴">
          <NavLink end to="/">
            <LayoutDashboard aria-hidden="true" />
            대시보드
          </NavLink>
          <NavLink to="/task">
            <ListTodo aria-hidden="true" />할 일
          </NavLink>
          <NavLink to={authAction.to}>
            <AuthIcon aria-hidden="true" />
            {authLabel}
          </NavLink>
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
