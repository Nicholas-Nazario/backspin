import { chromium } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const browser = await chromium.launch();
try {
  const { page } = await collectionFixture(browser);
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/discogs?*", (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    const entries = [1, 2, 3, 4, 5, 6].map((id) => ({
      id,
      instance_id: id,
      basic_information: {
        title: "Album " + id,
        master_id: id === 6 ? 1 : id,
        artists: [{ name: "Artist " + (id % 3) }],
        genres: [id % 2 ? "Jazz" : "Rock"],
      },
    }));
    return route.fulfill({
      json: {
        data:
          kind === "folders"
            ? { folders: [] }
            : kind === "release"
              ? { title: "Album 1", genres: ["Jazz"] }
              : { pagination: { pages: 1, items: 6 }, releases: entries },
        expiresAt: Date.now() + 300000,
      },
    });
  });
  await page.goto("http://localhost:3000");
  await page.getByRole("spinbutton", { name: "Albums in set" }).waitFor();
  assert.equal(await page.getByTestId("record-grid").count(), 0);
  assert.equal(
    await page
      .getByRole("link", { name: "Make a set", exact: true })
      .getAttribute("aria-current"),
    "page",
  );
  const builder = page.getByRole("region", { name: "Random set builder" });
  await builder
    .getByRole("spinbutton", { name: "Albums in set", exact: true })
    .fill("5");
  assert.equal(
    await builder.getByRole("slider", { name: "Artist variety" }).isVisible(),
    false,
  );
  await builder.getByText("Fine-tune the mix", { exact: true }).click();
  await builder.getByRole("slider", { name: "Artist variety" }).fill("2");
  await builder.getByRole("slider", { name: "Genre variety" }).fill("1");
  await builder.getByRole("slider", { name: "Era variety" }).fill("2");
  await builder
    .getByRole("button", { name: "Mix my set", exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .waitFor();
  assert.equal(await builder.locator("ol li").count(), 5);
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .waitFor();
  assert.equal(await builder.locator("ol li").count(), 5);
  await page.setViewportSize({ width: 1280, height: 1500 });
  const gridFirst = builder
    .locator("ol li")
    .first()
    .getByRole("button", { name: /^Reorder / });
  const gridTitle = (await gridFirst.getAttribute("aria-label"))!;
  await gridFirst.scrollIntoViewIfNeeded();
  const gridFrom = await gridFirst.boundingBox(),
    gridTo = await builder.locator("ol li").last().boundingBox();
  assert.ok(gridFrom && gridTo && gridTo.y > gridFrom.y);
  await page.mouse.move(
    gridFrom.x + gridFrom.width / 2,
    gridFrom.y + gridFrom.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    gridTo.x + gridTo.width / 2,
    gridTo.y + gridTo.height / 2,
    { steps: 20 },
  );
  await page.mouse.up();
  assert.equal(
    await builder
      .locator("ol li")
      .last()
      .getByRole("button", { name: gridTitle, exact: true })
      .count(),
    1,
  );
  assert.equal(await page.getByRole("searchbox").count(), 0);
  assert.equal(await page.getByTestId("filter-panel").count(), 0);
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("8");
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .waitFor();
  assert.equal(await builder.locator("ol li").count(), 5);
  assert.match(
    await builder.getByRole("status").innerText(),
    /Only 5 albums available/,
  );
  await builder
    .getByRole("button", { name: /^View set record / })
    .first()
    .click();
  await page.getByRole("dialog").waitFor();
  await page.keyboard.press("Escape");
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  await builder
    .getByText("Cueing up your next session…", { exact: true })
    .waitFor();
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("1");
  await builder
    .getByText("Cueing up your next session…", { exact: true })
    .waitFor({ state: "hidden" });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .waitFor();
  assert.equal(await builder.locator("ol li").count(), 1);
  await builder
    .getByText("Cueing up your next session…", { exact: true })
    .waitFor({ state: "hidden" });
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("3");
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  await builder.locator("ol li").nth(2).waitFor();
  const firstCard = builder.locator("ol li").first();
  assert.ok(await firstCard.getByText(/Jazz|Rock/, { exact: true }).count());
  const artwork = await firstCard
    .getByRole("button", { name: /^View set record / })
    .locator(":scope > div")
    .boundingBox();
  assert.ok(
    artwork &&
      artwork.width > 200 &&
      Math.abs(artwork.width - artwork.height) < 2,
  );
  const firstName = (await builder
    .locator("ol li")
    .first()
    .getByRole("button", { name: /View set record/ })
    .getAttribute("aria-label"))!.replace("View set record ", "");
  await builder
    .getByRole("button", { name: "Pin " + firstName, exact: true })
    .click();
  assert.equal(
    await builder
      .getByRole("button", { name: "Swap " + firstName, exact: true })
      .isDisabled(),
    true,
  );
  const dragHandle = builder.getByRole("button", {
    name: "Reorder " + firstName,
    exact: true,
  });
  await dragHandle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Space");
  await builder
    .getByRole("button", { name: "Shuffle again", exact: true })
    .click();
  assert.equal(
    await builder
      .locator("ol li")
      .nth(1)
      .getByRole("button", { name: "Unpin " + firstName, exact: true })
      .count(),
    1,
  );
  const pinnedHandle = builder.getByRole("button", {
    name: "Reorder " + firstName,
    exact: true,
  });
  await pinnedHandle.scrollIntoViewIfNeeded();
  const from = await pinnedHandle.boundingBox(),
    to = await builder.locator("ol li").first().boundingBox();
  assert.ok(from && to);
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2);
  await page.mouse.down();
  await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, {
    steps: 12,
  });
  await page.mouse.up();
  assert.equal(
    await builder
      .locator("ol li")
      .first()
      .getByRole("button", { name: "Unpin " + firstName, exact: true })
      .count(),
    1,
  );
  await pinnedHandle.focus();
  await page.keyboard.press("Space");
  await page.keyboard.press("ArrowRight");
  await page.keyboard.press("Escape");
  assert.equal(
    await builder
      .locator("ol li")
      .first()
      .getByRole("button", { name: "Unpin " + firstName, exact: true })
      .count(),
    1,
  );
  const swapButton = builder
    .locator("ol li")
    .last()
    .getByRole("button", { name: /^Swap / });
  const oldTitle = (await swapButton.getAttribute("aria-label"))!.replace(
    "Swap ",
    "",
  );
  await swapButton.click();
  assert.equal(
    await builder
      .getByRole("button", { name: "View set record " + oldTitle, exact: true })
      .count(),
    0,
  );
  await builder
    .getByRole("button", { name: "Remove " + firstName, exact: true })
    .click();
  assert.equal(await builder.locator("ol li").count(), 2);
  assert.equal(
    await builder
      .getByRole("spinbutton", { name: "Albums in set" })
      .inputValue(),
    "2",
  );
  await page.setViewportSize({ width: 390, height: 844 });
  const touchFirst = builder
    .locator("ol li")
    .first()
    .getByRole("button", { name: /^Reorder / });
  const touchName = (await touchFirst.getAttribute("aria-label"))!;
  await touchFirst.evaluate((element) =>
    element.scrollIntoView({ block: "center" }),
  );
  const touchFrom = await touchFirst.boundingBox(),
    touchTo = await builder.locator("ol li").last().boundingBox();
  assert.ok(touchFrom && touchTo);
  const client = await page.context().newCDPSession(page);
  await client.send("Emulation.setTouchEmulationEnabled", {
    enabled: true,
    maxTouchPoints: 1,
  });
  const touchX = touchFrom.x + touchFrom.width / 2,
    touchStart = touchFrom.y + touchFrom.height / 2,
    touchEnd = touchTo.y + touchTo.height / 2;
  await client.send("Input.dispatchTouchEvent", {
    type: "touchStart",
    touchPoints: [{ x: touchX, y: touchStart }],
  });
  for (let step = 1; step <= 8; step++)
    await client.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [
        { x: touchX, y: touchStart + ((touchEnd - touchStart) * step) / 8 },
      ],
    });
  await client.send("Input.dispatchTouchEvent", {
    type: "touchEnd",
    touchPoints: [],
  });
  assert.equal(
    await builder
      .locator("ol li")
      .last()
      .getByRole("button", { name: touchName, exact: true })
      .count(),
    1,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("main [style]").count(), 0);
  assert.deepEqual(errors, []);
  await page.screenshot({ path: "/tmp/mystery-random-set.png" });
  console.log(
    "Random set browser checks passed: variety toggles, count, shuffle, filtered pool, shortage, details, empty pool, mobile.",
  );
} finally {
  await browser.close();
}
