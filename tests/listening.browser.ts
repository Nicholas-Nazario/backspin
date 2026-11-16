import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const browser = await chromium.launch();
try {
  const { page } = await collectionFixture(browser);
  await page.emulateMedia({ reducedMotion: "reduce" });
  let historyCalls = 0;
  page.on("request", (request) => {
    if (request.url().includes("/api/history")) historyCalls++;
  });
  const entries = Array.from({ length: 6 }, (_, i) => ({
    id: i + 1,
    instance_id: i + 1,
    basic_information: {
      title: "Album " + (i + 1),
      master_id: i + 1,
      artists: [{ name: "Artist " + i }],
      genres: ["Pop"],
    },
  }));
  await page.route("**/api/discogs?*", (route) =>
    route.fulfill({
      json: {
        data:
          new URL(route.request().url()).searchParams.get("kind") === "folders"
            ? { folders: [] }
            : { pagination: { pages: 1, items: 6 }, releases: entries },
        expiresAt: Date.now() + 300000,
      },
    }),
  );
  await page.goto("http://localhost:3000");
  const builder = page.getByRole("region", { name: "Random set builder" }),
    player = page.getByRole("region", { name: "Now playing", exact: true });
  await builder
    .getByRole("button", { name: "Mix my set", exact: true })
    .click();
  assert.equal(await player.count(), 0);
  const titles = () =>
    builder
      .locator("ol li")
      .getByRole("button", { name: /^View set record / })
      .evaluateAll((nodes) =>
        nodes.map((node) =>
          node.getAttribute("aria-label")!.replace("View set record ", ""),
        ),
      );
  const order = await titles();
  await builder
    .getByRole("button", { name: "Set now playing " + order[0], exact: true })
    .click();
  await player.getByText(order[0], { exact: true }).waitFor();
  assert.equal(
    await player.getByRole("button", { name: "Previous album" }).isDisabled(),
    true,
  );
  await player.getByRole("button", { name: "Next album" }).click();
  await player.getByText(order[1], { exact: true }).waitFor();
  await player.getByRole("button", { name: "Previous album" }).click();
  await player.getByText(order[0], { exact: true }).waitFor();
  const handle = builder.getByRole("button", {
    name: "Reorder " + order[0],
    exact: true,
  });
  await handle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await player.getByRole("button", { name: "Next album" }).click();
  await player.getByText(order[2], { exact: true }).waitFor();
  await builder
    .getByRole("button", {
      name: "Set now playing " + order.at(-1),
      exact: true,
    })
    .click();
  assert.equal(
    await player.getByRole("button", { name: "Next album" }).isDisabled(),
    true,
  );
  await builder
    .getByRole("button", { name: "Swap " + order.at(-1), exact: true })
    .click();
  await player.getByText(order.at(-1)!, { exact: true }).waitFor();
  await player.getByText("Outside this mix", { exact: true }).waitFor();
  assert.equal(
    await player.getByRole("button", { name: "Next album" }).isDisabled(),
    true,
  );
  assert.equal(
    await player.getByRole("button", { name: "Previous album" }).isDisabled(),
    true,
  );
  await player.getByRole("button", { name: "Stop listening" }).click();
  assert.equal(await player.count(), 0);
  const current = (await titles())[0];
  await builder
    .getByRole("button", { name: "Set now playing " + current, exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Remove " + current, exact: true })
    .click();
  await player.getByText(current, { exact: true }).waitFor();
  await player.getByText("Outside this mix", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("main [style]").count(), 0);
  await player.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/mystery-listening-controls.png" });
  await page.reload();
  assert.equal(await player.count(), 0);
  assert.equal(historyCalls, 0);
  console.log(
    "Listening checks passed: explicit selection, next/previous boundaries, reorder, swap/remove continuity, stop, reload, mobile, no history.",
  );
} finally {
  await browser.close();
}
