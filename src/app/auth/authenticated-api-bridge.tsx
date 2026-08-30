import { ApiClientProvider, createAuthenticatedRequest } from "@/shared/api";
import { type PropsWithChildren, useMemo } from "react";
import { mustRefreshAccessToken } from "./access-token";
import { useAuth } from "./auth-provider";

export function AuthenticatedApiBridge({ children }: PropsWithChildren) {
  const auth = useAuth();
  const client = useMemo(
    () => ({
      request: createAuthenticatedRequest({
        getSnapshot: auth.getSnapshot,
        mustRefresh: (snapshot) =>
          snapshot.accessToken === null || mustRefreshAccessToken(snapshot.accessToken),
        refresh: auth.refresh,
        terminate: auth.terminate,
      }),
    }),
    [auth.getSnapshot, auth.refresh, auth.terminate],
  );
  return <ApiClientProvider client={client}>{children}</ApiClientProvider>;
}
