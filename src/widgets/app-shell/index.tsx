import { LayoutDashboard, ListTodo } from "lucide-react";
import { NavLink, Outlet } from "react-router-dom";

export function AppShell() {
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
        </nav>
      </header>
      <main>
        <Outlet />
      </main>
    </>
  );
}
