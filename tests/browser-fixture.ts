import type { Browser, BrowserContext } from "@playwright/test";
import { seal } from "../lib/session";
export async function collectionFixture(
  browser: Browser | BrowserContext,
  baseURL = "http://localhost:3000",
) {
  const page = await browser.newPage();
  const cached = new Map<
    number,
    { masterId: number; year: number | null; expiresAt: number | null }
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
  let fetchYear:
    ((id: number) => number | null | Promise<number | null>) | undefined;
  await page.route("**/api/master-years?*", async (route) => {
    const params = new URL(route.request().url()).searchParams;
    const ids = (params.get("ids") || "").split(",").map(Number);
    const years = [];
    let failures = 0;
    for (const id of ids) {
      const row = cached.get(id);
      if (row && (row.expiresAt === null || row.expiresAt > Date.now())) {
        years.push(row);
      } else if (params.get("resolve") === "1" && fetchYear) {
        try {
          const year = await fetchYear(id);
          const result = {
            masterId: id,
            year,
            expiresAt: Date.now() + 5 * 3600000,
          };
          cached.set(id, result);
          years.push(result);
        } catch {
          failures++;
        }
      }
    }
    return route.fulfill({ json: { years, failures } }).catch(() => {});
  });
  return {
    page,
    resolveYearsWith: (lookup: NonNullable<typeof fetchYear>) => {
      fetchYear = lookup;
    },
    rememberYear: (
      id: number,
      year: number | null,
      ttl: number | null = 5 * 3600000,
    ) =>
      cached.set(id, {
        masterId: id,
        year,
        expiresAt: ttl === null ? null : Date.now() + ttl,
      }),
    clearYears: () => cached.clear(),
  };
}
