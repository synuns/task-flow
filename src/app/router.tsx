import { createBrowserRouter, type RouteObject } from "react-router-dom";
import { DashboardPage } from "@/pages/dashboard";
import { SignInPage } from "@/pages/sign-in";
import { TaskDetailPage } from "@/pages/task-detail";
import { TaskListPage } from "@/pages/task-list";
import { UserPage } from "@/pages/user";
import { AppShell } from "@/widgets/app-shell";
import { RouteErrorBoundary } from "./route-error-boundary";

export const appRoutes: RouteObject[] = [
  {
    path: "/",
    element: <AppShell />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "sign-in", element: <SignInPage /> },
      { path: "task", element: <TaskListPage /> },
      { path: "task/:id", element: <TaskDetailPage /> },
      { path: "user", element: <UserPage /> },
    ],
  },
];

export const appRouter = createBrowserRouter(appRoutes);
