import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const engine = process.env.MOBILE_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch();
try {
  const { page, rememberYear, clearYears } = await collectionFixture(
    browser,
    baseURL,
  );
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  let fail = false;
  let clockOffset = 0;
  let holdRefresh = true;
  let releaseRefresh: (() => void) | undefined;
  const releases = [1, 2, 3].map((id) => ({
    id,
    instance_id: id,
    basic_information: {
      title: `Album ${id}`,
      master_id: id,
      artists: [{ name: `Artist ${id}` }],
      genres: [id === 3 ? "Rock" : "Jazz"],
      styles: [id === 1 ? "Soul-Jazz" : "Hard Rock"],
    },
  }));
  await page.route("**/api/discogs?*", async (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    if (holdRefresh && !kind)
      await new Promise<void>((resolve) => {
        releaseRefresh = resolve;
      });
    if (fail && !kind)
      return route.fulfill({
        status: 503,
        json: { error: "Fixture unavailable" },
      });
    return route.fulfill({
      json: {
        data:
          kind === "folders"
            ? { folders: [] }
            : kind === "master"
              ? { year: 1971 }
              : { pagination: { pages: 1, items: 3 }, releases },
        expiresAt: Date.now() + clockOffset + 300000,
        fetchedAt: Date.now() + clockOffset,
      },
    });
  });
  await page.clock.install();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  const loadingPlayer = page.getByRole("button", {
    name: "Getting your records ready",
    exact: true,
  });
  await expect(loadingPlayer).toBeVisible();
  await expect(loadingPlayer).toBeDisabled();
  await expect(page.getByRole("status")).toHaveText(
    "Getting your records ready…",
  );
  assert.equal(
    await loadingPlayer.evaluate((node) => getComputedStyle(node).opacity),
    "1",
  );
  await expect(
    page.getByText("Opening your crates…", { exact: true }),
  ).toHaveCount(0);
  await expect(page.getByTestId("shuffle-deck")).toHaveCount(0);
  const loadingDisc = page.getByTestId("vinyl-disc");
  const loadingBounds = await loadingPlayer.boundingBox();
  const initialRotation = await loadingDisc.evaluate(
    (node) => getComputedStyle(node).transform,
  );
  await expect
    .poll(() =>
      loadingDisc.evaluate((node) => getComputedStyle(node).transform),
    )
    .not.toBe(initialRotation);
  await page.screenshot({
    path: "/tmp/backspin-collection-loading.png",
    fullPage: true,
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(
    await loadingDisc.evaluate((node) => getComputedStyle(node).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  holdRefresh = false;
  releaseRefresh!();
  releaseRefresh = undefined;

  const drop = page.getByRole("button", {
    name: "Drop the needle",
    exact: true,
  });
  await expect(drop).toBeEnabled();
  await expect(loadingPlayer).toHaveCount(0);
  await expect(page.getByTestId("shuffle-deck")).toHaveCount(0);
  const disc = page.getByTestId("vinyl-disc");
  assert.deepEqual(await drop.boundingBox(), loadingBounds);
  assert.equal(
    await disc.evaluate((node) => getComputedStyle(node).animationName),
    "none",
  );
  await expect(drop).toHaveText("Drop the needle");
  await expect(drop.locator("svg")).toHaveCount(0);
  await page.screenshot({
    path: "/tmp/backspin-vinyl-button.png",
    fullPage: true,
  });

  await expect(
    page.getByRole("link", { name: "Make a set", exact: true }),
  ).toHaveCount(0);
  await drop.click();
  await expect(drop).toHaveAttribute("data-motion", "spinning");
  await expect(drop).toBeDisabled();
  await expect(page.getByTestId("shuffle-deck")).toHaveCount(0);
  await expect(
    page.getByRole("article", { name: "Your album recommendation" }),
  ).toHaveCount(0);
  // Finish actual CSS animations to verify the phase handoff, rather than a parallel JS timer.
  await disc.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  await expect(drop).toHaveAttribute("data-motion", "rolling");
  await drop.evaluate((node) =>
    node.getAnimations().forEach((animation) => {
      animation.pause();
      animation.currentTime = 350;
    }),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: "/tmp/backspin-vinyl-roll.png",
    fullPage: true,
  });
  await drop.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );

  const result = page.getByRole("article", {
    name: "Your album recommendation",
  });
  await expect(result).toBeVisible();
  const first = await result.getByRole("heading").innerText();
  await result.evaluate((node) =>
    node.getAnimations().forEach((animation) => animation.finish()),
  );
  const artwork = page.getByTestId("recommendation-artwork");
  const artworkBounds = await artwork.boundingBox();
  const againBounds = await page
    .getByRole("button", { name: "Try another", exact: true })
    .boundingBox();
  const narrowBounds = await page
    .getByRole("button", { name: "Narrow it down", exact: true })
    .boundingBox();

  await page.getByRole("button", { name: "Try another", exact: true }).click();
  await expect(page.getByTestId("shuffle-deck")).toBeVisible();
  await expect(page.getByTestId("vinyl-button")).toHaveCount(0);
  const frontRecords = await page
    .getByTestId("shuffle-deck")
    .evaluate((node) => {
      const sleeves = [...node.children];
      const fronts = [0, 650, 1250].map((time) => {
        sleeves.forEach((sleeve) =>
          sleeve.getAnimations().forEach((animation) => {
            animation.pause();
            animation.currentTime = time;
          }),
        );
        const layers = sleeves.map((sleeve) =>
          Number(getComputedStyle(sleeve).zIndex),
        );
        return layers.indexOf(Math.max(...layers));
      });
      sleeves.forEach((sleeve) =>
        sleeve.getAnimations().forEach((animation) => animation.play()),
      );
      return fronts;
    });
  assert.equal(
    new Set(frontRecords).size,
    3,
    "Each colored record should take a turn at the front",
  );

  await expect(result).toBeVisible();
  await expect(result.getByRole("heading")).toHaveCount(0);
  await expect(page.getByTestId("recommendation-identity")).toHaveAttribute(
    "aria-hidden",
    "true",
  );
  assert.equal(
    await page
      .getByTestId("recommendation-identity")
      .locator("p")
      .first()
      .evaluate((node) => getComputedStyle(node).color),
    "rgba(0, 0, 0, 0)",
  );
  assert.notEqual(
    await page
      .getByTestId("recommendation-identity")
      .locator("h3")
      .evaluate((node) => getComputedStyle(node, "::after").animationName),
    "none",
  );
  await expect(page.getByRole("heading", { level: 2 })).toHaveCount(0);
  assert.deepEqual(await artwork.boundingBox(), artworkBounds);
  assert.deepEqual(
    await page
      .getByRole("button", { name: "Try another", exact: true })
      .boundingBox(),
    againBounds,
  );
  assert.deepEqual(
    await page
      .getByRole("button", { name: "Narrow it down", exact: true })
      .boundingBox(),
    narrowBounds,
  );
  await expect(
    page.getByRole("button", { name: "Try another", exact: true }),
  ).toBeDisabled();
  await page.screenshot({
    path: "/tmp/backspin-stable-shuffle.png",
    fullPage: true,
  });
  await page.clock.fastForward(2200);
  await expect(result.getByRole("heading")).not.toHaveText(first);
  assert.notEqual(await result.getByRole("heading").innerText(), first);
  await page
    .getByRole("button", { name: "Narrow it down", exact: true })
    .click();
  let sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("Era", { exact: false })).toBeDisabled();
  await sheet.getByLabel("Genre", { exact: false }).selectOption("Jazz");
  await sheet.getByRole("button", { name: "Mellow", exact: true }).click();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Narrow it down", exact: true }),
  ).toBeFocused();
  await drop.click();
  await expect(result).toBeVisible();
  await page.getByRole("button", { name: "Try another", exact: true }).click();
  await expect(page.getByTestId("shuffle-deck")).toHaveCount(0);
  await expect(result).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove genre filter" }),
  ).toHaveText("Jazz");
  await expect(
    page.getByRole("button", { name: "Remove mood filter" }),
  ).toHaveText("Mellow");
  await expect(
    page.getByRole("button", { name: "I’m putting this on" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: "View record on Discogs" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Narrow it down", exact: true })
    .click();
  await sheet
    .getByRole("button", { name: "Find original release years" })
    .click();
  await expect(sheet.getByLabel("Era", { exact: false })).toBeEnabled();
  await expect(sheet.getByText("Original year lookup complete")).toBeVisible();
  await sheet.getByLabel("Era", { exact: false }).selectOption("1970");
  await sheet.getByRole("button", { name: "That’s my lane" }).click();
  await drop.click();
  await expect(result).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Remove era filter" }),
  ).toHaveText("1970s");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.getByRole("button", { name: "Try another", exact: true }).click();
  await expect(page.getByTestId("shuffle-deck")).toHaveCount(0);
  await expect(result).toBeVisible();
  assert.equal(
    await result.evaluate((node) => getComputedStyle(node).animationName),
    "none",
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  assert.equal(await page.locator("main [style]").count(), 0);
  await page.screenshot({
    path: "/tmp/backspin-recommendation-mobile.png",
    fullPage: true,
  });
  // Cached-year availability, hard-limit mismatch, and missing-year behavior.
  clearYears();
  rememberYear(1, 1982);
  rememberYear(3, 1975);
  await page.reload();
  await expect(drop).toBeEnabled();
  await page
    .getByRole("button", { name: "Narrow it down", exact: true })
    .click();
  sheet = page.getByRole("dialog");
  await sheet.getByLabel("Genre", { exact: false }).selectOption("Jazz");
  await sheet.getByLabel("Era", { exact: false }).selectOption("1970");
  await sheet.getByRole("button", { name: "That’s my lane" }).click();
  await expect(page.getByText(/No records match those limits/)).toBeVisible();
  await expect(drop).toBeDisabled();
  await page
    .getByRole("button", { name: "Clear filters", exact: true })
    .click();
  await expect(drop).toBeEnabled();
  await drop.click();
  await expect(result).toBeVisible();
  const currentTitle = await result.getByRole("heading").innerText();
  holdRefresh = true;
  clockOffset = 300001;
  await page.clock.fastForward(300001);
  await expect.poll(() => !!releaseRefresh).toBe(true);
  await expect(result.getByRole("heading")).toHaveText(currentTitle);
  await expect(
    page.getByText("Opening your crates…", { exact: true }),
  ).toHaveCount(0);
  const another = page.getByRole("button", {
    name: "Try another",
    exact: true,
  });
  await expect(another).toBeDisabled();
  assert.equal(
    await another.evaluate((node) => getComputedStyle(node).opacity),
    "1",
  );
  holdRefresh = false;
  releaseRefresh!();
  await expect(another).toBeEnabled();
  await expect(result.getByRole("heading")).toHaveText(currentTitle);
  fail = true;
  clockOffset += 300001;

  await page.clock.fastForward(300001);
  await expect(
    page.getByRole("alert").filter({ hasText: "Fixture unavailable" }),
  ).toBeVisible();
  await expect(result).toHaveCount(0);
  fail = false;
  await page.getByRole("button", { name: "Try loading again" }).click();
  await expect(drop).toBeEnabled();
  // Cancelling a reveal must not allow its timer to restore a stale pick.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await drop.click();
  await page
    .getByRole("button", { name: "Narrow it down", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Genre", { exact: false })
    .selectOption("Rock");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "That’s my lane" })
    .click();
  await page.clock.fastForward(1000);
  await expect(result).toHaveCount(0);
  await drop.click();
  await expect(result).toBeVisible();
  await expect(result.getByRole("heading")).toHaveText("Album 3");
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.screenshot({
    path: "/tmp/backspin-recommendation-desktop.png",
    fullPage: true,
  });
  await page.goto(baseURL + "/collection");
  await expect(page.getByText(/Last updated/)).toBeVisible();
  await expect(page.locator("time")).toHaveAttribute("datetime", /T/);
  assert.deepEqual(errors, []);
  console.log(
    "Recommendation browser checks passed: mobile, single pick, reroll, filters, synced eras, mood fallback, quiet refresh, timestamps, reduced motion, error recovery, keyboard focus.",
  );
} finally {
  await browser.close();
}
