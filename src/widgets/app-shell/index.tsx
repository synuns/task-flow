import { CircleUserRound, LayoutDashboard, ListTodo, LogIn } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export type AuthAction = { kind: "sign-in"; to: "/sign-in" } | { kind: "profile"; to: "/user" };

const itemClass = ({ isActive }: { isActive: boolean }) =>
  `relative flex min-h-12 items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium text-xs transition-colors md:justify-start md:gap-3 md:text-sm ${
    isActive
      ? "bg-primary/35 text-foreground"
      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
  }`;

export function AppShell({ authAction }: { authAction: AuthAction }) {
  const AuthIcon = authAction.kind === "sign-in" ? LogIn : CircleUserRound;
  const authLabel = authAction.kind === "sign-in" ? "로그인" : "회원정보";
  return (
    <div className="min-h-svh bg-background md:grid md:grid-cols-[14rem_minmax(0,1fr)]">
      <header className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur md:sticky md:top-0 md:flex md:h-svh md:w-auto md:flex-col md:border-t-0 md:border-r md:bg-card md:p-5">
        <div className="hidden px-3 py-2 md:block">
          <p className="font-semibold text-lg">업무 관리</p>
        </div>
        <nav
          aria-label="주요 메뉴"
          className="grid grid-cols-3 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:flex md:h-[calc(100%-5rem)] md:flex-col md:p-0 md:pt-4"
        >
          <NavLink className={itemClass} end to="/">
            <LayoutDashboard aria-hidden="true" size={20} />
            <span>대시보드</span>
          </NavLink>
          <NavLink className={itemClass} to="/task">
            <ListTodo aria-hidden="true" size={20} />
            <span>할 일</span>
          </NavLink>
          <NavLink
            className={({ isActive }) => `${itemClass({ isActive })} md:mt-auto`}
            to={authAction.to}
          >
            <AuthIcon aria-hidden="true" size={20} />
            <span>{authLabel}</span>
          </NavLink>
        </nav>
      </header>
      <main className="min-w-0 px-4 py-8 pb-28 md:px-10 md:py-12 md:pb-12">
        <div className="mx-auto w-full max-w-[60rem]">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
