import { matchRoutes, type RouteObject } from "react-router-dom";

export const routePaths = {
  dashboard: "/",
  signIn: "/sign-in",
  signUp: "/sign-up",
  taskList: "/task",
  taskDetail: "/task/:id",
  user: "/user",
} as const;

const protectedRoutes: RouteObject[] = [
  { path: routePaths.dashboard },
  { path: routePaths.taskList },
  { path: routePaths.taskDetail },
  { path: routePaths.user },
];

const publicAuthRoutes: RouteObject[] = [{ path: routePaths.signIn }, { path: routePaths.signUp }];

export function isProtectedPath(pathname: string): boolean {
  return matchRoutes(protectedRoutes, pathname) !== null;
}

export function isPublicAuthPath(pathname: string): boolean {
  return matchRoutes(publicAuthRoutes, pathname) !== null;
}
