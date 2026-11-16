import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const browser = await chromium.launch();
try {
  const { page, rememberYear } = await collectionFixture(browser);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const entries = Array.from({ length: 9 }, (_, i) => ({
    id: i + 1,
    instance_id: i + 1,
    basic_information: {
      title: "Album " + (i + 1),
      master_id: i + 1,
      artists: [{ name: "Artist " + i }],
      genres: [i < 4 ? "Pop" : "Rock"],
      styles: [i < 4 ? "Synth-pop" : "Disco"],
    },
  }));
  for (let id = 1; id <= 8; id++) rememberYear(id, id % 2 ? 1978 : 1991);
  await page.route("**/api/discogs?*", (route) =>
    route.fulfill({
      json: {
        data:
          new URL(route.request().url()).searchParams.get("kind") === "folders"
            ? { folders: [] }
            : { pagination: { pages: 1, items: 9 }, releases: entries },
        expiresAt: Date.now() + 300000,
      },
    }),
  );
  await page.goto("http://localhost:3000");
  const builder = page.getByRole("region", { name: "Random set builder" });
  const select = page.getByRole("combobox");
  const mixButton = builder.getByRole("button", {
    name: /^(Mix my set|Shuffle again)$/,
  });
  const titles = () =>
    builder
      .locator("ol li")
      .getByRole("button", { name: /^View set record / })
      .evaluateAll((nodes) =>
        nodes.map((n) =>
          Number(
            n.getAttribute("aria-label")!.replace("View set record Album ", ""),
          ),
        ),
      );
  await builder.getByRole("radio", { name: "Genre", exact: true }).check();
  await select.selectOption("Pop");
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("2");
  await mixButton.click();
  assert.ok((await titles()).every((id) => id <= 4));
  const first = (await titles())[0];
  await builder
    .getByRole("button", { name: "Pin Album " + first, exact: true })
    .click();
  await builder.getByRole("radio", { name: "Style", exact: true }).check();
  await select.selectOption("Disco");
  assert.equal(await mixButton.isDisabled(), true);
  await builder.getByRole("button", { name: "Release these pins" }).click();
  // Editing a displayed mix retains its committed mode until the new mode is generated.
  await builder
    .getByRole("button", { name: /^Swap Album / })
    .first()
    .click();
  assert.ok((await titles()).every((id) => id <= 4));
  await mixButton.click();
  assert.ok((await titles()).every((id) => id >= 5));
  await builder
    .getByRole("button", { name: /^Swap Album / })
    .first()
    .click();
  assert.ok((await titles()).every((id) => id >= 5));
  await builder.getByRole("radio", { name: "Era", exact: true }).check();
  await select.selectOption("1990");
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("5");
  await mixButton.click();
  assert.deepEqual(
    (await titles()).sort((a, b) => a - b),
    [2, 4, 6, 8],
  );
  assert.equal(
    await builder
      .getByRole("status")
      .filter({ hasText: "Only 4 albums" })
      .count(),
    1,
  );
  await mixButton.click();
  assert.ok((await titles()).every((id) => id % 2 === 0));
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("main [style]").count(), 0);
  console.log(
    "Mix modes passed: Pop-only, style-only, original era, shortages, incompatible pins, and committed-mode swaps.",
  );
} finally {
  await browser.close();
}
