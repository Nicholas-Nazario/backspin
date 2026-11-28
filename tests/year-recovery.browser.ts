import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
try {
  const { page, rememberYear, clearYears } = await collectionFixture(
    browser,
    baseURL,
  );
  let fail = true,
    delay = false,
    started = false;
  const calls: number[] = [];
  const forced: number[] = [];
  let collectionForced = false;
  await page.route("**/api/discogs?*", async (r) => {
    const q = new URL(r.request().url()).searchParams;
    let data: unknown;
    if (q.get("kind") === "folders") data = { folders: [] };
    else if (q.get("kind") === "master") {
      const id = Number(q.get("id"));
      calls.push(id);
      if (q.get("refresh") === "1") forced.push(id);
      started = true;
      if (delay) {
        delay = false;
        await new Promise((resolve) => setTimeout(resolve, 400));
      }
      if (id === 100 && fail) {
        fail = false;
        await r
          .fulfill({
            status: 502,
            json: { error: "Temporary upstream failure" },
          })
          .catch(() => {});
        return;
      }
      rememberYear(id, 1971);
      data = { year: 1971 };
    } else {
      collectionForced ||= q.get("refresh") === "1";
      data = {
        pagination: { pages: 1, items: 2 },
        releases: [100, 200].map((id) => ({
          id,
          instance_id: id,
          basic_information: {
            title: "Album " + id,
            master_id: id,
            artists: [{ name: "Artist" }],
          },
        })),
      };
    }
    await r
      .fulfill({ json: { data, expiresAt: Date.now() + 300000 } })
      .catch(() => {});
  });
  await page.goto(baseURL + "/collection");
  await page.getByRole("button", { name: "View Album 100" }).waitFor();
  await page.getByTestId("filter-panel").locator("summary").click();
  await page
    .getByRole("button", { name: "Find missing years", exact: true })
    .click();
  await page
    .getByText("1 of 2 original years known.", { exact: false })
    .waitFor();
  assert.deepEqual(calls, [100, 200]);
  await page
    .getByRole("button", { name: "Retry missing", exact: true })
    .click();
  await page
    .getByText("2 of 2 original years known.", { exact: false })
    .waitFor();
  assert.deepEqual(calls, [100, 200, 100]);
  await page
    .getByRole("button", { name: "Refresh years", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Refresh years", exact: true })
    .waitFor();
  assert.deepEqual(forced, [100, 200]);
  clearYears();
  await page.reload();
  await page.getByRole("button", { name: "View Album 100" }).waitFor();
  await page.getByTestId("filter-panel").locator("summary").click();
  delay = true;
  started = false;
  await page
    .getByRole("button", { name: "Find missing years", exact: true })
    .click();
  await page
    .getByRole("progressbar", { name: "Albums checked for original years" })
    .waitFor();
  while (!started) await page.waitForTimeout(10);
  await page
    .getByRole("button", { name: "Refresh collection", exact: true })
    .click();
  await page
    .getByText("2 of 2 original years known.", { exact: false })
    .waitFor();
  assert.equal(collectionForced, true);
  const callsBeforeSnapshot = calls.length;
  let fullSnapshot = true;
  await page.route("**/api/master-years?*", (route) =>
    route.fulfill({
      json: {
        years: [
          { masterId: 100, year: 1971, expiresAt: null },
          ...(fullSnapshot
            ? [{ masterId: 200, year: null, expiresAt: null }]
            : []),
        ],
      },
    }),
  );
  await page.reload();
  await page.getByTestId("filter-panel").locator("summary").click();
  await expect(page.getByText("Original year lookup complete")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Find missing years" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Refresh years" })).toHaveCount(
    0,
  );
  assert.equal(calls.length, callsBeforeSnapshot);

  fullSnapshot = false;
  await page.reload();
  await page.getByTestId("filter-panel").locator("summary").click();
  await page.getByRole("button", { name: "Find missing years" }).click();
  const refresh = page.getByRole("button", { name: "Refresh years" });
  await refresh.click();
  await expect(refresh).toBeVisible();
  assert.deepEqual(calls.slice(callsBeforeSnapshot), [200, 200]);
  console.log(
    "Recovery checks passed: failed album does not stop batch, retry skips completed masters, collection refresh resumes lookup.",
  );
} finally {
  await browser.close();
}
