import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
import type { Entry } from "../lib/collection";

async function sceneBounds(room: import("@playwright/test").Locator) {
  return room.getByTestId("listening-scene").evaluate((scene) => {
    const identity = scene
      .querySelector("[data-long]")!
      .getBoundingClientRect();
    const frame = scene.getBoundingClientRect();
    return identity.bottom <= frame.top + (frame.height * 546) / 1260;
  });
}

const browser = await chromium.launch();
try {
  const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
  const { page, rememberYear } = await collectionFixture(browser, baseURL);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.clock.install();
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const entries: Entry[] = Array.from({ length: 6 }, (_, index) => ({
    id: index + 1,
    instance_id: index + 1,
    basic_information: {
      title:
        index === 1
          ? "Songs for the Last Afternoon Before Everybody Comes Home"
          : index === 5
            ? "Songs for a Very Long Evening with Many Friends and Stories "
                .repeat(4)
                .trim()
            : `Room album ${index + 1}`,
      master_id: index + 1,
      artists: [
        {
          name:
            index === 1
              ? "The Society for Unhurried Listening"
              : index === 5
                ? "The Neighborhood Orchestra and All Their Friends from the Other Side of the City"
                : "Room artist",
        },
      ],
      genres: ["Jazz", "Folk", "Pop"],
      cover_image:
        index === 3 ? undefined : `https://artwork.fixture/${index + 1}.svg`,
    },
  }));
  rememberYear(1, 1974);
  let failCollection = false;
  let holdRefresh: Promise<void> | null = null;
  let collectionCalls = 0;
  await page.route("https://artwork.fixture/*", (route) => {
    const id = Number(
      new URL(route.request().url()).pathname.slice(1).replace(".svg", ""),
    );
    if (id === 5) return route.abort();
    const [width, height] =
      id === 2 ? [300, 500] : id === 3 ? [500, 300] : [500, 500];
    return route.fulfill({
      contentType: "image/svg+xml",
      body: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="#85BCCD"/><circle cx="150" cy="160" r="80" fill="#EF7257"/></svg>`,
    });
  });
  await page.route("**/api/discogs?*", async (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    if (kind === "folders")
      return route.fulfill({ json: { data: { folders: [] } } });
    collectionCalls++;
    if (holdRefresh) await holdRefresh;
    if (failCollection)
      return route.fulfill({
        status: 401,
        json: { error: "Reconnect to Discogs to load your collection." },
      });
    return route.fulfill({
      json: {
        data: {
          pagination: { pages: 1, items: entries.length },
          releases: entries,
        },
        expiresAt: await page.evaluate(() => Date.now() + 300000),
      },
    });
  });
  await page.goto(baseURL);
  const builder = page.getByRole("region", { name: "Random set builder" });
  const strip = page.getByRole("region", { name: "Now playing", exact: true });
  const room = page.getByRole("dialog", {
    name: "Listening room",
    exact: true,
  });
  await builder.getByRole("spinbutton", { name: "Albums in set" }).fill("6");
  await builder
    .getByRole("button", { name: "Mix my set", exact: true })
    .click();
  await expect(builder.locator("ol li")).toHaveCount(6);
  const queueOrder = () =>
    builder
      .locator("ol li")
      .evaluateAll((nodes) =>
        nodes.map((node) => node.getAttribute("data-record-id")),
      );
  const order = await queueOrder();
  const firstTitle = await builder
    .locator("ol li")
    .first()
    .getByRole("button", { name: /^Set now playing / })
    .getAttribute("aria-label");
  const firstAlbum = firstTitle!.replace("Set now playing ", "");
  await builder
    .getByRole("button", { name: `Pin ${firstAlbum}`, exact: true })
    .click();
  await builder.getByRole("button", { name: firstTitle!, exact: true }).click();
  await strip
    .getByRole("button", { name: "Listening room", exact: true })
    .click();
  await expect(room).toBeVisible();
  assert.equal(await room.evaluate((el) => el.matches(":modal")), true);
  await expect(
    room.getByRole("button", { name: "Previous album" }),
  ).toBeDisabled();
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(
    room.getByRole("button", { name: "Previous album" }),
  ).toBeEnabled();
  await room.getByRole("button", { name: "Previous album" }).click();
  await room
    .getByRole("button", { name: "Artwork credits", exact: true })
    .click();
  const credits = page.getByRole("dialog", {
    name: "Artwork credits",
    exact: true,
  });
  await expect(
    credits.getByRole("heading", { name: "Artwork credits" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(credits).toHaveCount(0);
  await expect(room).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(room).toHaveCount(0);
  await expect(
    strip.getByRole("button", { name: "Listening room", exact: true }),
  ).toBeFocused();
  assert.deepEqual(await queueOrder(), order);
  await expect(
    builder.getByRole("button", { name: `Unpin ${firstAlbum}`, exact: true }),
  ).toBeVisible();

  for (const entry of entries) {
    await builder
      .getByRole("button", {
        name: `Set now playing ${entry.basic_information.title}`,
        exact: true,
      })
      .click();
    await strip
      .getByRole("button", { name: "Listening room", exact: true })
      .click();
    await expect(
      room.getByRole("heading", {
        level: 2,
        name: entry.basic_information.title,
      }),
    ).toBeVisible();
    await expect(
      room.getByRole("link", { name: "Data provided by Discogs" }),
    ).toHaveAttribute("href", `https://www.discogs.com/release/${entry.id}`);
    if ([4, 5].includes(entry.id))
      await expect(
        room.getByTestId("listening-scene").getByText("No artwork available"),
      ).toBeVisible();
    else {
      const image = room.getByRole("img", {
        name: `Cover of ${entry.basic_information.title}`,
      });
      await expect(image).toBeVisible();
      assert.equal(
        await image.evaluate((el) => getComputedStyle(el).objectFit),
        "contain",
      );
    }
    if (String(entry.instance_id) === order.at(-1)) {
      await expect(
        room.getByRole("button", { name: "Next album" }),
      ).toBeDisabled();
    }
    await expect(room.getByText("Pop", { exact: true })).toHaveCount(0);
    if (entry.id === 1)
      await expect(room.getByText("1974", { exact: true })).toBeVisible();
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
      const fits = await room.evaluate(
        (el) => el.scrollWidth <= el.clientWidth,
      );
      assert.equal(fits, true, `Room overflow at ${width}×${height}`);
      if (width >= 1280) {
        const metadataFits = await sceneBounds(room);
        assert.equal(
          metadataFits,
          true,
          `Album identity overlaps player at ${width}×${height} for record ${entry.id}`,
        );
      }
      await expect(
        room.getByRole("button", { name: "Return to mix", exact: true }),
      ).toBeEnabled();
    }
    if (entry.id === 2) {
      await room
        .getByRole("button", { name: "Record details", exact: true })
        .click();
      await expect(
        page
          .getByRole("dialog", { name: "Record details", exact: true })
          .getByRole("heading", { name: entry.basic_information.title }),
      ).toBeVisible();
      await page.keyboard.press("Escape");
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.screenshot({ path: "/tmp/backspin-room-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: "/tmp/backspin-room-mobile.png",
      });
    }
    await room
      .getByRole("button", { name: "Return to mix", exact: true })
      .click();
  }

  // Removing from the queue preserves the selected collection record.
  const removed = entries[0].basic_information.title;
  await builder
    .getByRole("button", { name: `Set now playing ${removed}`, exact: true })
    .click();
  await builder
    .getByRole("button", { name: `Remove ${removed}`, exact: true })
    .click();
  await strip
    .getByRole("button", { name: "Listening room", exact: true })
    .click();
  await expect(
    room.getByRole("heading", { name: removed, exact: true }),
  ).toBeVisible();
  await expect(
    room.getByRole("button", { name: "Previous album" }),
  ).toBeDisabled();
  await expect(room.getByRole("button", { name: "Next album" })).toBeDisabled();

  // Force the existing snapshot expiry while the room remains mounted.
  let resume!: () => void;
  holdRefresh = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.clock.fastForward(300001);
  await expect(
    room.getByRole("heading", { name: "Refreshing your collection…" }),
  ).toBeVisible();
  await expect(
    room.getByRole("img", { name: `Cover of ${removed}` }),
  ).toHaveCount(0);
  resume();
  holdRefresh = null;
  await expect(
    room.getByRole("heading", { name: removed, exact: true }),
  ).toBeVisible();
  failCollection = true;
  await page.clock.fastForward(300001);
  await expect(
    room.getByRole("heading", { name: "Your collection needs attention" }),
  ).toBeVisible();
  await expect(
    room.getByRole("img", { name: `Cover of ${removed}` }),
  ).toHaveCount(0);
  failCollection = false;
  await room.getByRole("button", { name: "Retry collection" }).click();
  await expect(
    room.getByRole("heading", { name: removed, exact: true }),
  ).toBeVisible();
  assert.ok(collectionCalls >= 4);
  // A removed collection record must not leave old artwork or select a replacement.
  entries.splice(0, 1);
  await page.clock.fastForward(300001);
  await expect(
    room.getByText("This record is no longer available in your collection.", {
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    room.getByRole("img", { name: `Cover of ${removed}` }),
  ).toHaveCount(0);
  await expect(room.getByRole("button", { name: "Next album" })).toBeDisabled();
  await room.getByRole("button", { name: "Stop listening" }).click();
  await expect(room).toHaveCount(0);
  await expect(strip).toHaveCount(0);
  // Normal motion shares the same fixture, with no extra metadata requests.
  await page.clock.pauseAt(
    new Date(await page.evaluate(() => Date.now() + 1000)),
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 1920, height: 1080 });
  const remainingOrder = await queueOrder();
  const selectFirst = builder
    .locator("ol li")
    .first()
    .getByRole("button", { name: /^Set now playing / });
  await selectFirst.click();
  await strip
    .getByRole("button", { name: "Listening room", exact: true })
    .click();
  const scene = room.getByTestId("listening-scene");
  const desktop = scene.locator("svg[data-phase]").first();
  const disc = desktop.locator('[data-motion="disc"]');
  await expect(scene).toHaveAttribute("data-motion-active", "true");
  await expect(scene).toHaveAttribute("data-transition", "idle");
  assert.equal(
    await disc.evaluate((el) => getComputedStyle(el).animationPlayState),
    "running",
  );
  const center = () =>
    disc.evaluate((el) => {
      const matrix = (el as SVGGraphicsElement).getCTM()!;
      return [matrix.e, matrix.f];
    });
  const beforeCenter = await center();
  const startingRotation = await disc.evaluate(
    (el) => getComputedStyle(el).transform,
  );
  await expect
    .poll(() => disc.evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(startingRotation);
  assert.deepEqual(await center(), beforeCenter);
  const selectedBeforePause = await scene.getAttribute("data-presented-id");
  await room.getByRole("button", { name: "Scene motion", exact: true }).click();
  await expect(scene).toHaveAttribute("data-motion-active", "false");
  assert.equal(
    await disc.evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  assert.equal(
    await scene.getAttribute("data-presented-id"),
    selectedBeforePause,
  );
  await room
    .getByRole("button", { name: "Return to mix", exact: true })
    .click();
  await strip
    .getByRole("button", { name: "Listening room", exact: true })
    .click();
  await expect(
    room.getByRole("button", { name: "Scene motion", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");
  await room.getByRole("button", { name: "Scene motion", exact: true }).click();
  await expect(scene).toHaveAttribute("data-motion-active", "true");

  // New selection during a swap settles on the latest record without an old callback winning.
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "idle");
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);
  await page.clock.runFor(3000);
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);

  // The complete shelf choreography changes the visible identity only once.
  const callsBeforeSwap = collectionCalls;
  await scene.evaluate((el) => {
    (window as unknown as { roomChanges: string[] }).roomChanges = [];
    const observer = new MutationObserver(() =>
      (window as unknown as { roomChanges: string[] }).roomChanges.push(
        el.getAttribute("data-presented-id")!,
      ),
    );
    observer.observe(el, {
      attributes: true,
      attributeFilter: ["data-presented-id"],
    });
    (window as unknown as { roomObserver: MutationObserver }).roomObserver =
      observer;
  });
  await room.getByRole("button", { name: "Next album" }).click();
  for (const phase of ["clear", "lift", "file", "take", "place", "settle"]) {
    await expect(scene).toHaveAttribute("data-transition", phase);
    if (["clear", "lift", "file", "take"].includes(phase))
      await expect(scene).toHaveAttribute(
        "data-presented-id",
        remainingOrder[2]!,
      );
    else
      await expect(scene).toHaveAttribute(
        "data-presented-id",
        remainingOrder[3]!,
      );
    if (phase === "file") {
      // Render a middle pose for visual review, without changing application state.
      await desktop.locator('[data-motion="returning"]').evaluate((el) => {
        const animation = el.getAnimations()[0];
        if (animation) {
          animation.pause();
          animation.currentTime = 400;
        }
      });
      await page.screenshot({ path: "/tmp/backspin-room-shelf-swap.png" });
    }
    const duration = await scene.evaluate((el) => {
      const value = getComputedStyle(el)
        .getPropertyValue("--swap-duration")
        .trim();
      return parseFloat(value) * (value.endsWith("ms") ? 1 : 1000);
    });
    await page.clock.runFor(duration + 1);
  }
  await expect(scene).toHaveAttribute("data-transition", "idle");
  const changes = await page.evaluate(() => {
    (
      window as unknown as { roomObserver: MutationObserver }
    ).roomObserver.disconnect();
    return (window as unknown as { roomChanges: string[] }).roomChanges;
  });
  assert.deepEqual(changes, [remainingOrder[3]]);
  assert.equal(collectionCalls, callsBeforeSwap);

  // Hiding the tab during a change cancels choreography and pauses ambient CSS motion.
  await room.getByRole("button", { name: "Previous album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene).toHaveAttribute("data-motion-active", "false");
  await expect(scene).toHaveAttribute("data-transition", "idle");
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);
  assert.equal(
    await disc.evaluate((el) => getComputedStyle(el).animationPlayState),
    "paused",
  );
  await page.clock.runFor(3000);
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);
  await page.evaluate(() => {
    Reflect.deleteProperty(document, "hidden");
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await expect(scene).toHaveAttribute("data-motion-active", "true");

  // Preference changes and compact layouts use an immediate, still-safe selection.
  await room.getByRole("button", { name: "Previous album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await expect(scene).toHaveAttribute("data-motion-active", "false");
  await expect(scene).toHaveAttribute("data-transition", "idle");
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[1]!);
  assert.equal(
    await disc.evaluate((el) => getComputedStyle(el).animationName),
    "none",
  );
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.setViewportSize({ width: 390, height: 844 });
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "idle");
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);
  const compactDisc = scene.locator(
    'svg[data-record="true"] [data-motion="disc"]',
  );
  assert.equal(
    await compactDisc.evaluate((el) => getComputedStyle(el).animationPlayState),
    "running",
  );
  await page.setViewportSize({ width: 1920, height: 1080 });

  // Expiry in mid-transition must hide old content and cancel pending visual commits.
  await room.getByRole("button", { name: "Next album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  holdRefresh = new Promise<void>((resolve) => {
    resume = resolve;
  });
  await page.clock.fastForward(300001);
  await expect(
    room.getByRole("heading", { name: "Refreshing your collection…" }),
  ).toBeVisible();
  await expect(room.getByRole("img", { name: /^Cover of/ })).toHaveCount(0);
  resume();
  holdRefresh = null;
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[3]!);
  await expect(scene).toHaveAttribute("data-transition", "idle");

  // Leaving mid-swap preserves the selected record and does not replay a stale change.
  await room.getByRole("button", { name: "Previous album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await room
    .getByRole("button", { name: "Return to mix", exact: true })
    .click();
  await page.clock.runFor(3000);
  await strip
    .getByRole("button", { name: "Listening room", exact: true })
    .click();
  await expect(scene).toHaveAttribute("data-presented-id", remainingOrder[2]!);
  await expect(scene).toHaveAttribute("data-transition", "idle");
  await expect(scene).toHaveAttribute("data-motion-active", "true");
  await room.getByRole("button", { name: "Previous album" }).click();
  await expect(scene).toHaveAttribute("data-transition", "clear");
  await room.getByRole("button", { name: "Stop listening" }).click();
  await page.clock.runFor(3000);
  await expect(room).toHaveCount(0);
  await expect(strip).toHaveCount(0);
  await page.reload();
  await expect(room).toHaveCount(0);
  await expect(strip).toHaveCount(0);
  assert.equal(await page.locator("main [style]").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Listening room passed: state continuity, keyboard/credits, navigation, artwork shapes/failure, mobile/TV, expiry/retry, rotation, shelf swaps, pause, reduced motion, visibility, interruption, stop and reload.",
  );
} finally {
  await browser.close();
}
