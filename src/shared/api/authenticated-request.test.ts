import { server } from "@/mocks/server";
import { http, HttpResponse } from "msw";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  type AuthCallbacks,
  type AuthSnapshot,
  createAuthenticatedRequest,
} from "./authenticated-request";

const url = new URL("/api/protected", globalThis.location.origin);
const isData = (value: unknown): value is { ok: true } =>
  !!value && typeof value === "object" && (value as { ok?: unknown }).ok === true;
const unauthorized = () =>
  HttpResponse.json({ errorMessage: "인증이 필요합니다." }, { status: 401 });

function harness(initial: AuthSnapshot, expired = false) {
  let snapshot = initial;
  const refresh = vi.fn(async (expected: AuthSnapshot) => {
    snapshot = { generation: expected.generation, accessToken: "token-b" };
    return snapshot;
  });
  const terminate = vi.fn((expected: AuthSnapshot) => {
    if (
      expected.generation === snapshot.generation &&
      expected.accessToken === snapshot.accessToken
    ) {
      snapshot = { generation: snapshot.generation + 1, accessToken: null };
    }
  });
  const callbacks: AuthCallbacks = {
    getSnapshot: () => snapshot,
    mustRefresh: () => expired,
    refresh,
    terminate,
  };
  return {
    callbacks,
    refresh,
    terminate,
    setSnapshot: (next: AuthSnapshot) => {
      snapshot = next;
    },
  };
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("authenticated request", () => {
  it("refreshes an expired token before the first protected transmission", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" }, true);
    const headers: Array<string | null> = [];
    server.use(
      http.get("/api/protected", ({ request }) => {
        headers.push(request.headers.get("Authorization"));
        return HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData),
    ).resolves.toEqual({ ok: true });

    expect(headers).toEqual(["Bearer token-b"]);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it("replays a late old-token 401 with the latest token without refreshing", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    const headers: Array<string | null> = [];
    server.use(
      http.get("/api/protected", async ({ request }) => {
        const header = request.headers.get("Authorization");
        headers.push(header);
        if (header === "Bearer token-a") {
          await pending;
          return unauthorized();
        }
        return HttpResponse.json({ ok: true });
      }),
    );

    const request = createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData);
    auth.setSnapshot({ generation: 1, accessToken: "token-b" });
    release();

    await expect(request).resolves.toEqual({ ok: true });
    expect(headers).toEqual(["Bearer token-a", "Bearer token-b"]);
    expect(auth.refresh).not.toHaveBeenCalled();
  });

  it("terminates the current session after one refreshed replay also returns 401", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    server.use(http.get("/api/protected", () => unauthorized()));

    await expect(
      createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData),
    ).rejects.toMatchObject({ kind: "aborted" });

    expect(auth.refresh).toHaveBeenCalledTimes(1);
    expect(auth.terminate).toHaveBeenCalledWith({ generation: 1, accessToken: "token-b" });
  });

  it("sends a DELETE at most twice when the second transmission is the auth replay", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    const headers: Array<string | null> = [];
    server.use(
      http.delete("/api/protected", ({ request }) => {
        const header = request.headers.get("Authorization");
        headers.push(header);
        return header === "Bearer token-a" ? unauthorized() : HttpResponse.json({ ok: true });
      }),
    );

    await expect(
      createAuthenticatedRequest(auth.callbacks)(url, { method: "DELETE" }, isData),
    ).resolves.toEqual({ ok: true });

    expect(headers).toEqual(["Bearer token-a", "Bearer token-b"]);
    expect(auth.refresh).toHaveBeenCalledTimes(1);
  });

  it("discards a previous generation response without refresh or termination", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/protected", async () => {
        await pending;
        return unauthorized();
      }),
    );

    const request = createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData);
    auth.setSnapshot({ generation: 2, accessToken: "token-c" });
    release();

    await expect(request).rejects.toMatchObject({ kind: "aborted" });
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(auth.terminate).not.toHaveBeenCalled();
  });

  it("discards a successful response from an older token", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    let release: () => void = () => undefined;
    const pending = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.get("/api/protected", async () => {
        await pending;
        return HttpResponse.json({ ok: true });
      }),
    );

    const request = createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData);
    auth.setSnapshot({ generation: 1, accessToken: "token-b" });
    release();

    await expect(request).rejects.toMatchObject({ kind: "aborted" });
  });

  it("preserves a current-session network error", async () => {
    const auth = harness({ generation: 1, accessToken: "token-a" });
    server.use(http.get("/api/protected", () => HttpResponse.error()));

    await expect(
      createAuthenticatedRequest(auth.callbacks)(url, { method: "GET" }, isData),
    ).rejects.toMatchObject({ kind: "network" });
    expect(auth.refresh).not.toHaveBeenCalled();
    expect(auth.terminate).not.toHaveBeenCalled();
  });
});
