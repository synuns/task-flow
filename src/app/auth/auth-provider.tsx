import {
  type ApiError,
  type AuthSnapshot,
  type AuthTokenPair,
  isApiError,
  refreshAccessToken,
} from "@/shared/api";
import type { QueryClient } from "@tanstack/react-query";
import {
  createContext,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { readAccessTokenClaims } from "./access-token";

export type AuthStatus =
  | { kind: "initializing" }
  | { kind: "anonymous" }
  | { kind: "unavailable"; message: string }
  | { kind: "authenticated"; generation: number; accessToken: string; userId: string };

export type AuthController = {
  status: AuthStatus;
  getSnapshot(): AuthSnapshot;
  acceptSignIn(tokens: AuthTokenPair): void;
  refresh(expected: AuthSnapshot): Promise<AuthSnapshot>;
  terminate(expected: AuthSnapshot): void;
  retryBootstrap(): Promise<void>;
};

type InFlightRefresh = AuthSnapshot & { promise: Promise<AuthSnapshot> };

const AuthContext = createContext<AuthController | null>(null);
const protectedRoots = new Set(["dashboard", "tasks", "task", "user"]);

function sameSnapshot(left: AuthSnapshot, right: AuthSnapshot): boolean {
  return left.generation === right.generation && left.accessToken === right.accessToken;
}

function isTerminalRefreshError(value: unknown): boolean {
  return (
    isApiError(value) && value.kind === "http" && (value.status === 400 || value.status === 401)
  );
}

function aborted(): ApiError {
  return { kind: "aborted", message: "이전 세션 요청이 폐기되었습니다." };
}

function invalidToken(): ApiError {
  return { kind: "invalid-response", status: 200, message: "인증 토큰 형식이 올바르지 않습니다." };
}

export function AuthProvider({
  queryClient,
  children,
}: PropsWithChildren<{ queryClient: QueryClient }>) {
  const snapshotRef = useRef<AuthSnapshot>({ generation: 0, accessToken: null });
  const inFlightRef = useRef<InFlightRefresh | null>(null);
  const startedRef = useRef(false);
  const [status, setStatus] = useState<AuthStatus>({ kind: "initializing" });

  const commitAuthenticated = useCallback(
    (tokens: AuthTokenPair, generation: number): AuthSnapshot => {
      const claims = readAccessTokenClaims(tokens.accessToken);
      if (!claims) throw invalidToken();
      const snapshot = { generation, accessToken: tokens.accessToken };
      snapshotRef.current = snapshot;
      setStatus({
        kind: "authenticated",
        generation,
        accessToken: tokens.accessToken,
        userId: claims.id,
      });
      return snapshot;
    },
    [],
  );

  const getSnapshot = useCallback(() => snapshotRef.current, []);

  const removeProtectedQueries = useCallback(() => {
    const predicate = (query: { queryKey: readonly unknown[] }) =>
      protectedRoots.has(String(query.queryKey[0]));
    void queryClient.cancelQueries({ predicate });
    queryClient.removeQueries({ predicate });
  }, [queryClient]);

  const terminate = useCallback(
    (expected: AuthSnapshot) => {
      if (!sameSnapshot(snapshotRef.current, expected)) return;
      snapshotRef.current = { generation: expected.generation + 1, accessToken: null };
      setStatus({ kind: "anonymous" });
      removeProtectedQueries();
    },
    [removeProtectedQueries],
  );

  const acceptSignIn = useCallback(
    (tokens: AuthTokenPair) => {
      removeProtectedQueries();
      commitAuthenticated(tokens, snapshotRef.current.generation + 1);
    },
    [commitAuthenticated, removeProtectedQueries],
  );

  const refresh = useCallback(
    (expected: AuthSnapshot): Promise<AuthSnapshot> => {
      if (!expected.accessToken || !sameSnapshot(snapshotRef.current, expected)) {
        return Promise.reject(aborted());
      }
      const active = inFlightRef.current;
      if (active && sameSnapshot(active, expected)) return active.promise;

      const promise = (async () => {
        try {
          const tokens = await refreshAccessToken();
          if (!sameSnapshot(snapshotRef.current, expected)) throw aborted();
          return commitAuthenticated(tokens, expected.generation);
        } catch (error) {
          if (!sameSnapshot(snapshotRef.current, expected)) throw aborted();
          if (isTerminalRefreshError(error)) terminate(expected);
          throw error;
        }
      })();
      inFlightRef.current = { ...expected, promise };
      const clear = () => {
        if (inFlightRef.current?.promise === promise) inFlightRef.current = null;
      };
      void promise.then(clear, clear);
      return promise;
    },
    [commitAuthenticated, terminate],
  );

  const retryBootstrap = useCallback(async () => {
    const expected = snapshotRef.current;
    setStatus({ kind: "initializing" });
    try {
      const tokens = await refreshAccessToken();
      if (!sameSnapshot(snapshotRef.current, expected)) return;
      commitAuthenticated(tokens, expected.generation);
    } catch (error) {
      if (!sameSnapshot(snapshotRef.current, expected)) return;
      if (isTerminalRefreshError(error)) {
        setStatus({ kind: "anonymous" });
        return;
      }
      setStatus({
        kind: "unavailable",
        message: isApiError(error) ? error.message : "인증 상태를 확인하지 못했습니다.",
      });
    }
  }, [commitAuthenticated]);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    void retryBootstrap();
  }, [retryBootstrap]);

  const value = useMemo<AuthController>(
    () => ({
      status,
      getSnapshot,
      acceptSignIn,
      refresh,
      terminate,
      retryBootstrap,
    }),
    [status, getSnapshot, acceptSignIn, refresh, terminate, retryBootstrap],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthController {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider is missing");
  return auth;
}
