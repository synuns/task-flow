import { matchPath } from "react-router-dom";

const exactRoutes = ["/", "/task", "/user"] as const;

export function isProtectedPath(pathname: string): boolean {
  if (exactRoutes.includes(pathname as (typeof exactRoutes)[number])) return true;
  const match = matchPath({ path: "/task/:id", end: true }, pathname);
  if (!match?.params.id) return false;
  try {
    const id = decodeURIComponent(match.params.id);
    return id.length > 0 && !id.includes("/");
  } catch {
    return false;
  }
}

export function safeReturnTo(candidate: unknown, origin: string): string {
  if (typeof candidate !== "string") return "/";
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin || url.pathname === "/sign-in" || !isProtectedPath(url.pathname)) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
