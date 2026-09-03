import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const fixtureStorageKey = "__kbhc_msw_auth_fixture__";

describe("auth fixture persistence", () => {
  beforeEach(() => {
    sessionStorage.removeItem(fixtureStorageKey);
    vi.resetModules();
  });

  afterEach(async () => {
    const fixture = await import("./auth");
    fixture.resetAuthFixture();
  });

  it("keeps the mock server refresh session across a page module reload", async () => {
    const firstModule = await import("./auth");
    const first = firstModule.startAuthSession("user-1");

    vi.resetModules();
    const reloadedModule = await import("./auth");
    const rotated = reloadedModule.rotateRefreshToken(first.refreshToken);

    expect(rotated).not.toBeNull();
    expect(rotated?.accessToken).not.toBe(first.accessToken);
    expect(rotated?.refreshToken).not.toBe(first.refreshToken);
  });

  it("keeps the user identity through bearer, refresh, and revocation", async () => {
    const fixture = await import("./auth");
    const first = fixture.startAuthSession("user-2");

    expect(fixture.bearerUserId(`Bearer ${first.accessToken}`)).toBe("user-2");
    const rotated = fixture.rotateRefreshToken(first.refreshToken);
    expect(fixture.bearerUserId(`Bearer ${rotated?.accessToken}`)).toBe("user-2");

    fixture.revokeAuthSession("user-2");
    expect(fixture.bearerUserId(`Bearer ${rotated?.accessToken}`)).toBeNull();
    expect(fixture.rotateRefreshToken(rotated?.refreshToken ?? "")).toBeNull();
  });
});
