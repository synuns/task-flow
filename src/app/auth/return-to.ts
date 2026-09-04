import { isProtectedPath } from "./route-policy";

export function safeReturnTo(candidate: unknown, origin: string): string {
  if (typeof candidate !== "string") return "/";
  try {
    const url = new URL(candidate, origin);
    decodeURIComponent(url.pathname);
    if (url.origin !== origin || !isProtectedPath(url.pathname)) {
      return "/";
    }
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return "/";
  }
}
