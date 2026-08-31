import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "./auth-provider";
import { isProtectedPath, safeReturnTo } from "./return-to";

export function AuthRouteBoundary() {
  const auth = useAuth();
  const location = useLocation();

  if (auth.status.kind === "initializing") {
    return <p role="status">인증 상태를 확인하고 있습니다.</p>;
  }
  if (auth.status.kind === "unavailable") {
    return (
      <section>
        <p role="alert">{auth.status.message}</p>
        <button onClick={() => void auth.retryBootstrap()} type="button">
          다시 확인
        </button>
      </section>
    );
  }
  if (auth.status.kind === "anonymous" && isProtectedPath(location.pathname)) {
    const returnTo = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate replace state={{ returnTo }} to="/sign-in" />;
  }
  if (auth.status.kind === "authenticated" && location.pathname === "/sign-in") {
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
