const exactRoutes = ["/", "/task", "/user"] as const;

function isEncodedTaskPath(pathname: string): boolean {
  if (!pathname.startsWith("/task/")) return false;
  const segment = pathname.slice("/task/".length);
  if (!segment || segment.includes("/")) return false;
  try {
    return decodeURIComponent(segment).length > 0;
  } catch {
    return false;
  }
}

export function isProtectedPath(pathname: string): boolean {
  if (exactRoutes.includes(pathname as (typeof exactRoutes)[number])) return true;
  return isEncodedTaskPath(pathname);
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
