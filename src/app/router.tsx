import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard";
import { SignInPage } from "@/pages/sign-in";
import { TaskDetailPage } from "@/pages/task-detail";
import { TaskListPage } from "@/pages/task-list";
import { UserPage } from "@/pages/user";
import { AppShell } from "@/widgets/app-shell";
import { AuthRouteBoundary } from "./auth/auth-route-boundary";
import { useAuth } from "./auth/auth-provider";
import { RouteErrorBoundary } from "./route-error-boundary";

function AuthShellRoute() {
  const auth = useAuth();
  return (
    <AppShell
      authAction={
        auth.status.kind === "authenticated"
          ? { kind: "profile", to: "/user" }
          : { kind: "sign-in", to: "/sign-in" }
      }
    />
  );
}

function SignInRoute() {
  const auth = useAuth();
  return <SignInPage onAuthenticated={auth.acceptSignIn} />;
}

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AuthShellRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthRouteBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: "sign-in", element: <SignInRoute /> },
          { path: "task", element: <TaskListPage /> },
          { path: "task/:id", element: <TaskDetailPage /> },
          { path: "user", element: <UserPage /> },
        ],
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
