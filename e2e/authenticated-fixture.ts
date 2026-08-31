import type { Page } from "@playwright/test";

const refreshToken = "e2e-approved-refresh-token";

export async function prepareAuthenticatedPage(page: Page): Promise<void> {
  await page.addInitScript(
    ({ storageKey, token }) => {
      if (sessionStorage.getItem(storageKey) !== null) return;
      localStorage.setItem(
        "__msw-cookie-store__",
        JSON.stringify([
          {
            key: "token",
            value: token,
            domain: "127.0.0.1",
            path: "/api/refresh",
            httpOnly: true,
            hostOnly: true,
            sameSite: "strict",
          },
        ]),
      );
      sessionStorage.setItem(
        storageKey,
        JSON.stringify({
          sequence: 0,
          currentAccessToken: null,
          activeRefreshTokens: [token],
        }),
      );
    },
    { storageKey: "__kbhc_msw_auth_fixture__", token: refreshToken },
  );
}
