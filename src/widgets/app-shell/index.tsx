import { CircleUserRound, LayoutDashboard, ListTodo, LogIn } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export type AuthAction = { kind: "sign-in"; to: "/sign-in" } | { kind: "profile"; to: "/user" };

export function AppShell({ authAction }: { authAction: AuthAction }) {
  const AuthIcon = authAction.kind === "sign-in" ? LogIn : CircleUserRound;
  const authLabel = authAction.kind === "sign-in" ? "로그인" : "회원정보";
  return (
    <div className="min-h-svh bg-background">
      <header className="fixed inset-x-0 bottom-0 z-50 border-t bg-card/95 backdrop-blur md:inset-y-0 md:right-auto md:flex md:w-56 md:flex-col md:border-t-0 md:border-r md:bg-card">
        <div className="hidden border-b px-6 py-6 md:block">
          <p className="font-semibold text-lg">오케어 업무</p>
          <p className="mt-1 text-muted-foreground text-sm">오늘의 목표에 집중하세요.</p>
        </div>
        <nav
          aria-label="주요 메뉴"
          className="grid grid-cols-3 gap-1 p-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:flex md:flex-1 md:flex-col md:p-3"
        >
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium text-xs transition-colors md:justify-start md:gap-3 md:text-sm ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
            end
            to="/"
          >
            <LayoutDashboard aria-hidden="true" />
            <span>대시보드</span>
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium text-xs transition-colors md:justify-start md:gap-3 md:text-sm ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
            to="/task"
          >
            <ListTodo aria-hidden="true" />
            <span>할 일</span>
          </NavLink>
          <NavLink
            className={({ isActive }) =>
              `flex min-h-12 items-center justify-center gap-1 rounded-lg px-3 py-2 font-medium text-xs transition-colors md:mt-auto md:justify-start md:gap-3 md:text-sm ${
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`
            }
            to={authAction.to}
          >
            <AuthIcon aria-hidden="true" />
            <span>{authLabel}</span>
          </NavLink>
        </nav>
      </header>
      <main className="min-h-svh px-4 py-6 pb-28 md:ml-56 md:px-8 md:py-10">
        <div className="mx-auto w-full max-w-5xl">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
