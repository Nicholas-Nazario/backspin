import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";

const browser = await chromium.launch();
try {
  const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
  const { page } = await collectionFixture(browser, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.clock.install();
  async function setTime(hour: number, minute = 0) {
    const time = await page.evaluate(
      ({ hour, minute }) => new Date(2026, 10, 20, hour, minute).getTime(),
      { hour, minute },
    );
    await page.clock.setSystemTime(time);
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));
  }
  await setTime(6, 30);
  let fail = false;
  let hold: Promise<void> | null = null;
  let calls = 0;
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.route("https://display.fixture/*", (route) =>
    route.fulfill({
      contentType: "image/svg+xml",
      body: '<svg xmlns="http://www.w3.org/2000/svg" width="500" height="500"><rect width="500" height="500" fill="#85BCCD"/><circle cx="250" cy="250" r="120" fill="#EF7257"/></svg>',
    }),
  );
  await page.route("**/api/discogs?*", async (route) => {
    if (new URL(route.request().url()).searchParams.get("kind") === "folders")
      return route.fulfill({ json: { data: { folders: [] } } });
    calls++;
    if (hold) await hold;
    if (fail)
      return route.fulfill({
        status: 401,
        json: { error: "Reconnect to Discogs to load your collection." },
      });
    return route.fulfill({
      json: {
        data: {
          pagination: { pages: 1, items: 3 },
          releases: [1, 2, 3].map((id) => ({
            id,
            instance_id: id,
            basic_information: {
              title: `Display album ${id}`,
              artists: [{ name: `Display artist ${id}` }],
              cover_image: `https://display.fixture/${id}.svg`,
            },
          })),
        },
        expiresAt: await page.evaluate(() => Date.now() + 300000),
      },
    });
  });
  await page.goto(baseURL);
  const builder = page.getByRole("region", { name: "Random set builder" });
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("3");
  await builder
    .getByRole("button", { name: "Mix my set", exact: true })
    .click();
  await expect(builder.locator("ol li")).toHaveCount(3);
  const ids = await builder
    .locator("ol li")
    .evaluateAll((nodes) =>
      nodes.map((node) => node.getAttribute("data-record-id")!),
    );
  const strip = page.getByRole("region", { name: "Now playing", exact: true });
  const room = page.getByRole("dialog", {
    name: "Listening room",
    exact: true,
  });
  const preview = room.getByRole("complementary", { name: "Next record" });
  const lighting = room.getByRole("combobox", { name: "Room lighting" });
  const scene = room.getByTestId("listening-scene");
  async function enter() {
    await strip
      .getByRole("button", { name: "Listening room", exact: true })
      .click();
  }
  await builder
    .getByRole("button", {
      name: `Set now playing Display album ${ids[0]}`,
      exact: true,
    })
    .click();
  await enter();
  await expect(room).toHaveAttribute("data-lighting", "dawn");
  await expect(lighting).toHaveValue("auto");
  await expect(preview).toHaveAttribute("data-record-id", ids[1]);
  await expect(
    preview.getByText(`Display album ${ids[1]}`, { exact: true }),
  ).toBeVisible();
  const cover = room.getByRole("img", {
    name: `Cover of Display album ${ids[0]}`,
    exact: true,
  });
  const source = await cover.getAttribute("src");
  const callsBeforeLighting = calls;
  for (const theme of ["dawn", "day", "dusk", "night"]) {
    await lighting.selectOption(theme);
    await expect(room).toHaveAttribute("data-lighting", theme);
    assert.equal(await cover.getAttribute("src"), source);
    assert.equal(
      await cover.evaluate((el) => getComputedStyle(el).filter),
      "none",
    );
    assert.equal(await scene.getAttribute("data-presented-id"), ids[0]);
    await expect(preview).toHaveAttribute("data-record-id", ids[1]);
    const ratio = await lighting.evaluate((el) => {
      const style = getComputedStyle(el);
      const [a, b] = [style.color, style.backgroundColor].map((color) => {
        const rgb = color
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number)
          .map((value) => {
            value /= 255;
            return value <= 0.04045
              ? value / 12.92
              : ((value + 0.055) / 1.055) ** 2.4;
          });
        return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
      });
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    });
    assert.ok(ratio >= 4.5, `${theme} selector contrast ${ratio}`);
    await page.screenshot({ path: `/tmp/backspin-room-${theme}.png` });
  }
  assert.equal(calls, callsBeforeLighting);
  await setTime(12);
  await page.clock.runFor(60001);
  await expect(room).toHaveAttribute("data-lighting", "night");
  await room
    .getByRole("button", { name: "Return to mix", exact: true })
    .click();
  await enter();
  await expect(lighting).toHaveValue("night");

  await lighting.selectOption("auto");
  await expect(room).toHaveAttribute("data-lighting", "day");
  for (const [hour, minute, before, after] of [
    [4, 59, "night", "dawn"],
    [7, 59, "dawn", "day"],
    [16, 59, "day", "dusk"],
    [19, 59, "dusk", "night"],
    [23, 59, "night", "night"],
  ] as const) {
    await setTime(hour, minute);
    await expect(room).toHaveAttribute("data-lighting", before);
    await page.clock.runFor(60001);
    await expect(room).toHaveAttribute("data-lighting", after);
  }
  await setTime(12);
  await expect(room).toHaveAttribute("data-lighting", "day");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await setTime(18);
  await page.clock.runFor(60001);
  await expect(room).toHaveAttribute("data-lighting", "day");
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(room).toHaveAttribute("data-lighting", "dusk");

  for (const [width, height] of [
    [1280, 720],
    [1920, 1080],
    [2560, 1440],
    [3840, 2160],
    [768, 1024],
    [390, 844],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    assert.equal(
      await room.evaluate((el) => el.scrollWidth <= el.clientWidth),
      true,
    );
    await expect(lighting).toBeEnabled();
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await lighting.selectOption("night");
  await lighting.scrollIntoViewIfNeeded();
  await page.screenshot({ path: "/tmp/backspin-room-display-mobile.png" });

  // Refresh/failure must clear the preview along with the main record.
  let resume!: () => void;
  hold = new Promise((resolve) => {
    resume = resolve;
  });
  await page.clock.fastForward(300001);
  await expect(
    room.getByRole("heading", { name: "Refreshing your collection…" }),
  ).toBeVisible();
  await expect(preview).toHaveCount(0);
  resume();
  hold = null;
  await expect(preview).toHaveAttribute("data-record-id", ids[1]);
  fail = true;
  await page.clock.fastForward(300001);
  await expect(
    room.getByRole("heading", { name: "Your collection needs attention" }),
  ).toBeVisible();
  await expect(preview).toHaveCount(0);
  fail = false;
  await room.getByRole("button", { name: "Retry collection" }).click();
  await expect(preview).toHaveAttribute("data-record-id", ids[1]);

  // A light change during a swap must not remount or reset the animation.
  await page.setViewportSize({ width: 1920, height: 1080 });
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await expect(scene).toHaveAttribute("data-motion-active", "true");
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await lighting.selectOption("day");
  await expect(room).toHaveAttribute("data-lighting", "day");
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await expect(scene).toHaveAttribute("data-presented-id", ids[0]);
  await expect(preview).toHaveAttribute("data-record-id", ids[2]);
  await room.getByRole("button", { name: "Scene motion", exact: true }).click();
  await expect(scene).toHaveAttribute("data-presented-id", ids[1]);
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(
    preview.getByText("No next record", { exact: true }),
  ).toBeVisible();
  await expect(room.getByRole("button", { name: "Next album" })).toBeDisabled();
  await room.getByRole("button", { name: "Previous album" }).click();
  await expect(preview).toHaveAttribute("data-record-id", ids[2]);
  await room
    .getByRole("button", { name: "Return to mix", exact: true })
    .click();
  await builder
    .getByRole("button", {
      name: `Remove Display album ${ids[1]}`,
      exact: true,
    })
    .click();
  await enter();
  await expect(
    preview.getByText("No next record", { exact: true }),
  ).toBeVisible();
  await expect(room.getByRole("button", { name: "Next album" })).toBeDisabled();
  assert.equal(await room.locator("[style]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Room display passed: four manual states, clock cutoffs/midnight, override persistence, hidden/resume, preview order/boundaries/isolation, refresh/retry, responsive layouts, contrast and uninterrupted swaps.",
  );
} finally {
  await browser.close();
}
