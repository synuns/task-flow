import { Navigate, Outlet, useLocation } from "react-router-dom";
import { AsyncError, AsyncLoading, Skeleton } from "@/shared/ui";
import { useAuth } from "./auth-provider";
import { isProtectedPath, safeReturnTo } from "./return-to";

export function AuthRouteBoundary() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status.kind === "initializing") {
    return (
      <AsyncLoading
        className="mx-auto grid max-w-md gap-4"
        message="인증 상태를 확인하고 있습니다."
      >
        <Skeleton className="h-28 w-full" />
      </AsyncLoading>
    );
  }
  if (auth.status.kind === "unavailable") {
    return (
      <AsyncError
        className="mx-auto max-w-md"
        message={auth.status.message}
        onRetry={() => void auth.retryBootstrap()}
        title="인증 상태를 확인하지 못했습니다."
      />
    );
  }
  if (auth.status.kind === "anonymous" && isProtectedPath(location.pathname)) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace state={{ returnTo }} to="/sign-in" />;
  }
  if (
    auth.status.kind === "authenticated" &&
    (location.pathname === "/sign-in" || location.pathname === "/sign-up")
  ) {
    const state = location.state as { returnTo?: unknown } | null;
    return (
      <Navigate
        replace
        to={safeReturnTo(state?.returnTo, globalThis.location?.origin ?? "http://localhost")}
      />
    );
  }
  return <Outlet />;
}
