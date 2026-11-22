import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
import { seal } from "../lib/session";
import { SPOTIFY_SESSION_COOKIE } from "../lib/spotify-session";

const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
try {
  const { page } = await collectionFixture(browser, baseURL);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route("**/api/discogs?*", (route) =>
    route.fulfill({
      json: {
        data: { pagination: { pages: 1, items: 0 }, releases: [] },
        expiresAt: Date.now() + 300000,
        fetchedAt: Date.now(),
      },
    }),
  );
  const settings = page.getByLabel("Settings", { exact: true });
  const discogs = page.getByRole("region", { name: "Discogs", exact: true });
  const spotify = page.getByRole("region", { name: "Spotify", exact: true });
  await page.goto(baseURL + "/collection");
  await settings.click();
  await expect(
    discogs.getByText("Fixture Listener", { exact: true }),
  ).toBeVisible();
  await expect(
    discogs.getByRole("button", { name: "Disconnect Discogs" }),
  ).toBeVisible();
  await expect(
    spotify.getByText("Not connected", { exact: true }),
  ).toBeVisible();
  await expect(
    spotify.getByRole("button", { name: "Connect Spotify" }),
  ).toBeVisible();
  await expect(spotify.locator("form")).toHaveAttribute(
    "action",
    "/api/spotify/connect",
  );
  await expect(
    spotify.getByRole("button", { name: "Connect Spotify" }),
  ).toHaveAttribute("value", "/collection");

  const token = "spotify-browser-fixture-access";
  const session = {
    purpose: "spotify-session",
    accessToken: token,
    displayName: "Spotify Fixture Listener",
    expires: Date.now() + 3600000,
  };
  async function setSpotify(value: string) {
    await page.context().addCookies([
      {
        name: SPOTIFY_SESSION_COOKIE,
        value,
        url: baseURL,
        httpOnly: true,
        sameSite: "Lax",
      },
    ]);
  }
  await setSpotify(seal(session));
  await page.reload();
  await settings.click();
  await expect(
    discogs.getByText("Fixture Listener", { exact: true }),
  ).toBeVisible();
  await expect(
    spotify.getByText("Spotify Fixture Listener", { exact: true }),
  ).toBeVisible();
  await expect(
    spotify.getByRole("button", { name: "Disconnect Spotify" }),
  ).toBeVisible();
  await expect(spotify.locator("form")).toHaveAttribute(
    "action",
    "/api/spotify/disconnect",
  );
  assert.ok(!(await page.content()).includes(token));
  assert.ok(
    !(await page.evaluate(() => JSON.stringify(localStorage))).includes(token),
  );
  const logo = spotify.getByRole("img", { name: "Spotify", exact: true });
  await logo.evaluate((image: HTMLImageElement) => image.decode());
  assert.ok((await logo.boundingBox())!.width >= 70);
  await page.screenshot({
    path: "/tmp/backspin-service-connections.png",
    fullPage: true,
  });
  await spotify.getByText("Spotify Fixture Listener", { exact: true }).click();
  await expect(
    spotify.getByRole("button", { name: "Disconnect Spotify" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(spotify).toBeHidden();
  await expect(settings).toBeFocused();

  await page.goto(baseURL + "/collection?spotify=denied");
  await expect(
    page.getByRole("status").filter({ hasText: "cancelled" }),
  ).toBeVisible();
  await expect(
    spotify.getByText("Spotify Fixture Listener", { exact: true }),
  ).toBeVisible();
  await page.getByRole("heading", { name: "Backspin", exact: true }).click();
  await expect(spotify).toBeHidden();

  for (const value of [
    seal({ ...session, expires: Date.now() - 1 }),
    "invalid-cookie",
  ]) {
    await setSpotify(value);
    await page.goto(baseURL + "/collection");
    await settings.click();
    await expect(
      spotify.getByText("Not connected", { exact: true }),
    ).toBeVisible();
    await expect(
      discogs.getByText("Fixture Listener", { exact: true }),
    ).toBeVisible();
  }
  await page.context().clearCookies();
  await page.goto(baseURL);
  await settings.click();
  await expect(
    discogs.getByRole("button", { name: "Connect Discogs" }),
  ).toBeVisible();
  await expect(
    spotify.getByRole("button", { name: "Connect Spotify" }),
  ).toBeVisible();
  await page.goto(baseURL + "/privacy");
  await expect(
    page.getByRole("heading", { name: "Privacy and connections", exact: true }),
  ).toBeVisible();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  console.log(
    "Service connection browser checks passed: independent identities and actions, expired cookies, safe feedback, outside dismissal, public privacy page, and no token exposure to HTML/localStorage.",
  );
} finally {
  await browser.close();
}
