import { refreshAccessToken, type AuthTokenPair } from "@/shared/api";
import { QueryClient } from "@tanstack/react-query";
import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type AuthController, AuthProvider, useAuth } from "./auth-provider";

vi.mock("@/shared/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/shared/api")>()),
  refreshAccessToken: vi.fn(),
}));

const refreshMock = vi.mocked(refreshAccessToken);

function tokens(id: string, sequence: number): AuthTokenPair {
  const encode = (value: unknown) =>
    btoa(JSON.stringify(value)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  return {
    accessToken: `${encode({ alg: "none" })}.${encode({
      id,
      exp: Math.floor(Date.now() / 1000) + 300,
      jti: `access-${sequence}`,
    })}.`,
    refreshToken: `${encode({ alg: "none" })}.${encode({
      id,
      exp: Math.floor(Date.now() / 1000) + 600,
      jti: `refresh-${sequence}`,
    })}.`,
  };
}

function renderProvider(queryClient = new QueryClient()) {
  let controller: AuthController | null = null;
  function Probe() {
    controller = useAuth();
    return <p>{controller.status.kind}</p>;
  }
  render(
    <AuthProvider queryClient={queryClient}>
      <Probe />
    </AuthProvider>,
  );
  return {
    queryClient,
    controller: () => {
      if (!controller) throw new Error("auth controller is not ready");
      return controller;
    },
  };
}

afterEach(() => {
  cleanup();
  vi.resetAllMocks();
});

describe("AuthProvider", () => {
  it("treats bootstrap 401 as an anonymous visit", async () => {
    refreshMock.mockRejectedValue({ kind: "http", status: 401, message: "unauthorized" });
    renderProvider();

    expect(await screen.findByText("anonymous")).toBeInTheDocument();
    expect(refreshMock).toHaveBeenCalledTimes(1);
  });

  it("keeps a recoverable unavailable state for bootstrap network failure", async () => {
    refreshMock.mockRejectedValue({ kind: "network", message: "offline" });
    renderProvider();

    expect(await screen.findByText("unavailable")).toBeInTheDocument();
  });

  it("joins concurrent refresh calls for the same snapshot", async () => {
    refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "missing" });
    const view = renderProvider();
    await screen.findByText("anonymous");
    view.controller().acceptSignIn(tokens("user-1", 1));
    await screen.findByText("authenticated");
    const expected = view.controller().getSnapshot();
    let release: (value: AuthTokenPair) => void = () => undefined;
    refreshMock.mockImplementationOnce(
      () =>
        new Promise<AuthTokenPair>((resolve) => {
          release = resolve;
        }),
    );

    const first = view.controller().refresh(expected);
    const second = view.controller().refresh(expected);
    release(tokens("user-1", 2));

    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.objectContaining({ generation: expected.generation }),
      expect.objectContaining({ generation: expected.generation }),
    ]);
    expect(refreshMock).toHaveBeenCalledTimes(2);
    expect(await first).toEqual(await second);
  });

  it("discards a late refresh after a newer sign-in", async () => {
    refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "missing" });
    const view = renderProvider();
    await screen.findByText("anonymous");
    view.controller().acceptSignIn(tokens("user-1", 1));
    await screen.findByText("authenticated");
    const expected = view.controller().getSnapshot();
    let release: (value: AuthTokenPair) => void = () => undefined;
    refreshMock.mockImplementationOnce(
      () =>
        new Promise<AuthTokenPair>((resolve) => {
          release = resolve;
        }),
    );
    const pending = view.controller().refresh(expected);

    view.controller().acceptSignIn(tokens("user-2", 3));
    const newest = view.controller().getSnapshot();
    release(tokens("user-1", 2));

    await expect(pending).rejects.toMatchObject({ kind: "aborted" });
    expect(view.controller().getSnapshot()).toEqual(newest);
    await waitFor(() =>
      expect(view.controller().status).toMatchObject({ kind: "authenticated", userId: "user-2" }),
    );
  });

  it("clears protected cache only for a matching terminal snapshot", async () => {
    refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "missing" });
    const view = renderProvider();
    await screen.findByText("anonymous");
    view.controller().acceptSignIn(tokens("user-1", 1));
    await screen.findByText("authenticated");
    view.queryClient.setQueryData(["tasks", 1], { data: [] });
    view.queryClient.setQueryData(["unrelated"], { keep: true });
    const current = view.controller().getSnapshot();

    view.controller().terminate({ ...current, generation: current.generation - 1 });
    expect(view.queryClient.getQueryData(["tasks", 1])).toEqual({ data: [] });
    view.controller().terminate(current);

    await waitFor(() => expect(view.controller().status.kind).toBe("anonymous"));
    expect(view.queryClient.getQueryData(["tasks", 1])).toBeUndefined();
    expect(view.queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
  });

  it("terminates an authenticated session when refresh returns 401", async () => {
    refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "missing" });
    const view = renderProvider();
    await screen.findByText("anonymous");
    view.controller().acceptSignIn(tokens("user-1", 1));
    await screen.findByText("authenticated");
    view.queryClient.setQueryData(["tasks", 1], { data: [] });
    view.queryClient.setQueryData(["unrelated"], { keep: true });
    const current = view.controller().getSnapshot();
    refreshMock.mockRejectedValueOnce({ kind: "http", status: 401, message: "expired" });

    await expect(view.controller().refresh(current)).rejects.toMatchObject({
      kind: "http",
      status: 401,
    });

    await waitFor(() => expect(view.controller().status.kind).toBe("anonymous"));
    expect(view.controller().getSnapshot()).toEqual({
      generation: current.generation + 1,
      accessToken: null,
    });
    expect(view.queryClient.getQueryData(["tasks", 1])).toBeUndefined();
    expect(view.queryClient.getQueryData(["unrelated"])).toEqual({ keep: true });
  });
});
