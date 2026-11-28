import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
try {
  const { page, rememberYear, clearYears, resolveYearsWith } =
    await collectionFixture(browser, baseURL);
  let fail = true,
    delay = false,
    started = false;
  const calls: number[] = [];

  let collectionForced = false;
  resolveYearsWith(async (id) => {
    calls.push(id);
    started = true;
    if (delay) {
      delay = false;
      await new Promise((resolve) => setTimeout(resolve, 400));
    }
    if (id === 100 && fail) {
      fail = false;
      throw new Error("Temporary upstream failure");
    }
    return 1971;
  });
  await page.route("**/api/discogs?*", async (r) => {
    const q = new URL(r.request().url()).searchParams;
    let data: unknown;
    if (q.get("kind") === "folders") data = { folders: [] };
    else {
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
  clearYears();
  rememberYear(100, 1971, null);
  rememberYear(200, null, null);
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

  clearYears();
  rememberYear(100, 1971, null);
  await page.reload();
  await page.getByTestId("filter-panel").locator("summary").click();
  await page.getByRole("button", { name: "Find missing years" }).click();
  await expect(page.getByText("Original year lookup complete")).toBeVisible();
  await expect(page.getByRole("button", { name: "Refresh years" })).toHaveCount(
    0,
  );
  assert.deepEqual(calls.slice(callsBeforeSnapshot), [200]);
  console.log(
    "Recovery checks passed: failed album does not stop batch, retry skips completed masters, collection refresh resumes lookup.",
  );
} finally {
  await browser.close();
}
