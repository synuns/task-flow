import { createBrowserRouter, type RouteObject, useNavigate } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { TaskDetailPage } from "@/pages/task-detail";
import { TaskListPage } from "@/pages/task-list";
import { UserPage } from "@/pages/user";
import { deleteUser, useApiClient } from "@/shared/api";
import { AppShell } from "@/widgets/app-shell";
import { useAuth } from "./auth/auth-provider";
import { AuthRouteBoundary } from "./auth/auth-route-boundary";
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

function UserRoute() {
  const auth = useAuth();
  const client = useApiClient();
  const navigate = useNavigate();

  async function deleteAccount(password: string) {
    const snapshot = auth.getSnapshot();
    await deleteUser(client, password);
    auth.terminate(snapshot);
    navigate("/sign-in", { replace: true });
  }

  return <UserPage onDelete={deleteAccount} />;
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
          { path: "sign-up", element: <SignUpPage /> },
          { path: "task", element: <TaskListPage /> },
          { path: "task/:id", element: <TaskDetailPage /> },
          { path: "user", element: <UserRoute /> },
        ],
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
