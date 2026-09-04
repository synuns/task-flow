import { createBrowserRouter, type RouteObject, useNavigate } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard";
import { SignInPage } from "@/pages/sign-in";
import { SignUpPage } from "@/pages/sign-up";
import { TaskDetailPage } from "@/pages/task-detail";
import { TaskListPage } from "@/pages/task-list";
import { UserPage } from "@/pages/user";
import { deleteUser, signOut, useApiClient } from "@/shared/api";
import { AppShell } from "@/widgets/app-shell";
import { useAuth } from "./auth/auth-provider";
import { AuthRouteBoundary } from "./auth/auth-route-boundary";
import { routePaths } from "./auth/route-policy";
import { RouteErrorBoundary } from "./route-error-boundary";

function AuthShellRoute() {
  const auth = useAuth();
  return (
    <AppShell
      authAction={
        auth.status.kind === "authenticated"
          ? { kind: "profile", to: routePaths.user }
          : { kind: "sign-in", to: routePaths.signIn }
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
    navigate(routePaths.signIn, { replace: true });
  }

  async function signOutCurrentSession() {
    const snapshot = auth.getSnapshot();
    await signOut(client);
    auth.terminate(snapshot);
    navigate(routePaths.signIn, { replace: true });
  }

  return <UserPage onDelete={deleteAccount} onSignOut={signOutCurrentSession} />;
}

export const appRoutes: RouteObject[] = [
  {
    path: routePaths.dashboard,
    element: <AuthShellRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      {
        element: <AuthRouteBoundary />,
        children: [
          { index: true, element: <DashboardPage /> },
          { path: routePaths.signIn, element: <SignInRoute /> },
          { path: routePaths.signUp, element: <SignUpPage /> },
          { path: routePaths.taskList, element: <TaskListPage /> },
          { path: routePaths.taskDetail, element: <TaskDetailPage /> },
          { path: routePaths.user, element: <UserRoute /> },
        ],
      },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
