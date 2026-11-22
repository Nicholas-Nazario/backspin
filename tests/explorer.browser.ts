// Deterministic browser fixture: no requests to Discogs and no real account data.
import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const browser = await chromium.launch();
try {
  const { page, rememberYear } = await collectionFixture(browser);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let masterCalls = 0;
  await page.route("**/api/discogs?*", (route) => {
    const q = new URL(route.request().url()).searchParams;
    const kind = q.get("kind");
    if (kind === "master") {
      masterCalls++;
      rememberYear(Number(q.get("id")), 1971);
    }
    const record = (id: number, title: string, master: number) => ({
      id,
      instance_id: id,
      folder_id: 1,
      basic_information: {
        title,
        master_id: master,
        artists: [{ name: "Fixture Artist" }],
        genres: ["Jazz"],
        styles: ["Soul-Jazz"],
        formats: [{ name: "Vinyl" }],
      },
    });
    const data =
      kind === "folders"
        ? {
            folders: [
              { id: 0, name: "All" },
              { id: 1, name: "Shelf" },
            ],
          }
        : kind === "master"
          ? { year: 1971 }
          : kind === "release"
            ? {
                id: 1,
                title: "First Album",
                genres: ["Jazz"],
                styles: ["Soul-Jazz"],
                extraartists: [{ name: "A Producer", role: "Producer" }],
              }
            : {
                pagination: { page: 1, pages: 1, items: 3 },
                releases: [
                  record(1, "First Album", 100),
                  record(2, "Another Edition", 100),
                  record(3, "Unknown Album", 0),
                ],
              };
    return route.fulfill({ json: { data, expiresAt: Date.now() + 300000 } });
  });
  await page.goto("http://localhost:3000/collection");
  await page
    .getByRole("button", { name: "View First Album", exact: true })
    .waitFor();
  assert.equal(
    await page.getByTestId("record-grid").locator("article").count(),
    3,
  );
  assert.equal(
    await page.getByText("Data provided by Discogs.", { exact: true }).count(),
    1,
  );
  await page
    .getByRole("button", { name: "Filter by genre Jazz", exact: true })
    .first()
    .click();
  await page.getByRole("button", { name: "Remove genre Jazz" }).waitFor();
  await page.getByRole("button", { name: "Remove genre Jazz" }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Disconnect Discogs", exact: true })
      .isVisible(),
    false,
  );
  await page.getByLabel("Settings", { exact: true }).click();
  assert.equal(
    await page
      .getByRole("button", { name: "Disconnect Discogs", exact: true })
      .isVisible(),
    true,
  );
  await page.getByLabel("Settings", { exact: true }).click();
  await page.getByLabel("Find a record").fill("First");
  assert.equal(
    await page.getByTestId("record-grid").locator("article").count(),
    1,
  );
  await page.getByLabel("Find a record").fill("");
  await page.getByTestId("filter-panel").locator("summary").click();
  await page
    .getByRole("button", { name: "Find original release years", exact: true })
    .click();
  await page
    .getByTestId("filter-controls")
    .locator("select")
    .nth(4)
    .selectOption("1970");
  assert.equal(
    await page.getByTestId("record-grid").locator("article").count(),
    2,
  );
  await page.getByLabel("Group editions").check();
  assert.equal(
    await page.getByTestId("record-grid").locator("article").count(),
    1,
  );
  await page.getByRole("button", { name: "Clear filters" }).click();
  await page
    .getByRole("button", { name: "View First Album", exact: true })
    .click();
  await page.getByRole("dialog").waitFor();
  await page.getByText("A Producer", { exact: true }).waitFor();
  await page.keyboard.press("Escape");
  assert.equal(await page.getByRole("dialog").isVisible(), false);
  const beforeReload = masterCalls;
  await page.reload();
  await page.getByTestId("filter-panel").locator("summary").click();
  await page
    .getByText("Original year lookup complete", { exact: true })
    .waitFor();
  assert.equal(masterCalls, beforeReload);
  assert.equal(await page.locator("main [style]").count(), 0);
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: "/tmp/mystery-collection-mobile.png" });
  rememberYear(100, 1971, 1000);
  await page.reload();
  await page.getByTestId("filter-panel").locator("summary").click();
  await page
    .getByText("Original year lookup complete", { exact: true })
    .waitFor();
  await page
    .getByRole("button", { name: "Find original release years", exact: true })
    .waitFor();
  await page
    .getByText("0 of 3 original years known.", { exact: false })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Browser checks passed: full collection, search, original era, grouping, details, Escape, mobile overflow.",
  );
} finally {
  await browser.close();
}
