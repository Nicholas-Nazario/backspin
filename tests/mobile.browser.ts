import { chromium, webkit, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
import { taglines } from "../app/recommendation/taglines";
const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const engine = process.env.MOBILE_BROWSER === "webkit" ? webkit : chromium;
const browser = await engine.launch();
try {
  const context = await browser.newContext({
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 3,
  });
  const { page } = await collectionFixture(context, baseURL);
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const longTitle =
    "You've Got A Friend — The Complete Collection of Unforgettable Songs and Beautiful Moments";
  await page.route("**/api/discogs?*", (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    return route.fulfill({
      json: {
        data:
          kind === "folders"
            ? { folders: [] }
            : {
                pagination: { pages: 1, items: 1 },
                releases: [
                  {
                    id: 1,
                    instance_id: 1,
                    basic_information: {
                      title: longTitle,
                      artists: [
                        {
                          name: "Johnny Mathis & The Incredibly Long Named Orchestra",
                        },
                      ],
                      genres: ["Pop"],
                      cover_image: "https://fixture.invalid/cover.svg",
                    },
                  },
                ],
              },
        expiresAt: Date.now() + 300000,
        fetchedAt: Date.now(),
      },
    });
  });
  await page.route("https://fixture.invalid/cover.svg", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600"><rect width="600" height="600" fill="#c2d8b5"/><circle cx="300" cy="300" r="180" fill="#ec8e73"/></svg>',
    }),
  );
  await page.emulateMedia({ reducedMotion: "reduce" });
  const viewports = [
    { width: 320, height: 568 },
    { width: 360, height: 640 },
    { width: 375, height: 667 },
    { width: 390, height: 844 },
    { width: 430, height: 932 },
    { width: 844, height: 390 },
  ];
  async function fits(label: string) {
    const overflow = await page.evaluate(() => ({
      viewport: innerWidth,
      visualViewport: window.visualViewport?.width,
      scale: window.visualViewport?.scale,
      width: document.documentElement.scrollWidth,
      offenders: [...document.querySelectorAll("main *")]
        .filter((node) => {
          const box = node.getBoundingClientRect();
          return box.width && (box.left < -1 || box.right > innerWidth + 1);
        })
        .slice(0, 8)
        .map((node) => ({
          tag: node.tagName,
          class: node.getAttribute("class"),
          right: node.getBoundingClientRect().right,
        })),
    }));
    assert.equal(
      overflow.scale,
      1,
      `${label}: emulated pinch-zoom must be reset before layout checks`,
    );
    assert.ok(
      Math.abs(
        (overflow.visualViewport ?? overflow.viewport) - overflow.viewport,
      ) < 1,
      `${label}: visual and layout viewports must match`,
    );
    assert.ok(
      overflow.width <= overflow.viewport,
      `${label}: ${JSON.stringify(overflow)}`,
    );
    assert.deepEqual(overflow.offenders, [], `${label}: offscreen elements`);
  }
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto(baseURL);
    const drop = page.getByRole("button", {
      name: "Drop the needle",
      exact: true,
    });
    await expect(drop).toBeEnabled();
    for (const tagline of taglines) {
      await page.getByRole("heading", { level: 2 }).evaluate((node, text) => {
        node.textContent = text;
      }, tagline);
      await fits(`landing ${viewport.width}: ${tagline}`);
      if (viewport.width < viewport.height) {
        const bounds = await drop.boundingBox();
        assert.ok(
          bounds && bounds.y + bounds.height <= viewport.height,
          `Primary action should fit on ${viewport.width}px phone`,
        );
      }
    }
    await page.screenshot({
      path: `/tmp/backspin-mobile-landing-${viewport.width}.png`,
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Narrow it down", exact: true })
      .tap();
    const sheet = page.getByRole("dialog");
    await expect(sheet).toBeVisible();
    const bounds = await sheet.boundingBox();
    assert.ok(
      bounds &&
        bounds.x >= 0 &&
        bounds.x + bounds.width <= viewport.width + 1 &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= viewport.height + 1,
    );
    await sheet.getByRole("button", { name: "Mellow", exact: true }).tap();
    await sheet.getByLabel("Genre", { exact: false }).selectOption("Pop");
    await sheet.getByRole("button", { name: "That’s my lane" }).tap();
    await expect(sheet).toHaveCount(0);
    await drop.tap();
    const result = page.getByRole("article", {
      name: "Your album recommendation",
    });
    await expect(result.getByRole("heading")).toHaveText(longTitle);
    await fits(`result ${viewport.width}`);
    await expect(result.locator("img")).toBeVisible();
    assert.equal(
      await result
        .locator("img")
        .evaluate((node) => getComputedStyle(node).objectFit),
      "contain",
    );
    const another = page.getByRole("button", {
      name: "Try another",
      exact: true,
    });
    await another.tap();
    await expect(result).toBeVisible();
    await page.getByRole("button", { name: "Remove mood filter" }).tap();
    await expect(drop).toBeEnabled();
    await drop.tap();
    await expect(result).toBeVisible();
    await fits(`filtered reroll ${viewport.width}`);
    await page.screenshot({
      path: `/tmp/backspin-mobile-result-${viewport.width}.png`,
      fullPage: true,
    });
    await page.getByLabel("Settings", { exact: true }).tap();
    await fits(`settings ${viewport.width}`);
    const disconnect = page.getByRole("button", {
      name: "Disconnect Discogs",
      exact: true,
    });
    await expect(disconnect).toBeVisible();
    await page.getByText(/Connected as/).tap();
    await expect(disconnect).toBeVisible();
    await page.getByRole("heading", { name: "Backspin", exact: true }).tap();
    await expect(disconnect).toBeHidden();
    await page.getByLabel("Settings", { exact: true }).tap();
    await page.keyboard.press("Escape");
    await expect(disconnect).toBeHidden();
    await expect(page.getByLabel("Settings", { exact: true })).toBeFocused();
    await page.goto(baseURL + "/collection");
    await expect(page.getByText(/Last updated/)).toBeVisible();
    await fits(`collection ${viewport.width}`);
    const collectionHeading = await page
      .getByRole("heading", { name: "Collection", exact: true })
      .boundingBox();
    const refreshControl = await page
      .getByRole("button", { name: "Refresh collection", exact: true })
      .boundingBox();
    assert.ok(collectionHeading && refreshControl);
    assert.ok(
      Math.abs(
        collectionHeading.y +
          collectionHeading.height / 2 -
          (refreshControl.y + refreshControl.height / 2),
      ) < 1,
      `Collection heading and refresh should align at ${viewport.width}px`,
    );
    assert.ok(
      refreshControl.x >= collectionHeading.x + collectionHeading.width,
      `Refresh should stay beside the heading at ${viewport.width}px`,
    );
    const search = page.getByRole("searchbox");
    await search.tap();
    await search.fill("Johnny");
    assert.ok(
      await search.evaluate(
        (node) => parseFloat(getComputedStyle(node).fontSize) >= 16,
      ),
    );
    await fits(`collection search ${viewport.width}`);
  }
  await page.getByRole("link", { name: "Backspin", exact: true }).tap();
  await expect(
    page.getByRole("link", { name: "Discover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Collection", exact: true }).tap();
  await page
    .getByRole("link", { name: "Backspin", exact: true })
    .locator("img")
    .tap();
  await expect(
    page.getByRole("link", { name: "Discover", exact: true }),
  ).toHaveAttribute("aria-current", "page");
  assert.deepEqual(errors, []);
  console.log(
    "Mobile browser checks passed: 320–430px phones, landscape, all taglines, touch, long titles, artwork, filter sheet, rerolls, and settings.",
  );
  await context.close();
} finally {
  await browser.close();
}
