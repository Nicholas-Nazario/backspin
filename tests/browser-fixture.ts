import type { Browser } from "@playwright/test";
import { seal } from "../lib/session";
export async function collectionFixture(
  browser: Browser,
  baseURL = "http://localhost:3000",
) {
  const page = await browser.newPage();
  const cached = new Map<
    number,
    { masterId: number; year: number | null; expiresAt: number }
  >();
  await page.context().addCookies([
    {
      name: "mdj_session",
      value: seal({
        purpose: "session",
        token: { key: "browser-fixture", secret: "fixture" },
        username: "Fixture Listener",
        userId: 999999,
        expires: Date.now() + 3600000,
      }),
      url: baseURL,
      httpOnly: true,
      sameSite: "Lax",
    },
  ]);
  await page.route("**/api/years", (route) =>
    route.fulfill({ json: { years: [] } }),
  );
  await page.route("**/api/master-years?*", (route) => {
    const ids = (new URL(route.request().url()).searchParams.get("ids") || "")
      .split(",")
      .map(Number);
    return route.fulfill({
      json: {
        years: ids.flatMap((id) => {
          const row = cached.get(id);
          return row && row.expiresAt > Date.now() ? [row] : [];
        }),
      },
    });
  });
  return {
    page,
    rememberYear: (id: number, year: number | null, ttl = 5 * 3600000) =>
      cached.set(id, {
        masterId: id,
        year,
        expiresAt: Date.now() + ttl,
      }),
    clearYears: () => cached.clear(),
  };
}
