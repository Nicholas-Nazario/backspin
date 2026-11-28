import { spotifyRecommendations } from "../lib/spotify-recommendations";
import { chromium, expect } from "@playwright/test";
import assert from "node:assert/strict";
import { collectionFixture } from "./browser-fixture";
import { seal } from "../lib/session";
import { SPOTIFY_SESSION_COOKIE } from "../lib/spotify-session";

const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
try {
  const { page, rememberYear } = await collectionFixture(browser, baseURL);
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
  await page.goto(baseURL);
  await expect(
    page.getByRole("button", {
      name: "Find my picks from recent Spotify plays",
    }),
  ).toHaveCount(0);
  const connectionsTab = page
    .getByRole("navigation", { name: "Main navigation" })
    .getByRole("link", { name: "Explore", exact: true });
  await connectionsTab.click();
  await expect(page).toHaveURL(baseURL + "/spotify");
  await expect(connectionsTab).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("heading", { name: "Explore" })).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: "Find my picks from recent Spotify plays",
    }),
  ).toBeVisible();
  await settings.click();
  await expect(
    spotify.getByRole("button", { name: "Connect Spotify" }),
  ).toHaveAttribute("value", "/spotify");

  await setSpotify(seal(session));
  const releases = [
    "Recent A",
    "Recent B",
    "Both Styles",
    "Pick 2",
    "Pick 3",
    "Pick 4",
    "Pick 5",
    "Pick 6",
  ].map((title, index) => ({
    id: index + 1,
    instance_id: index + 1,
    basic_information: {
      title,
      artists: [{ name: `Artist ${index}` }],
      master_id: index === 5 ? 6 : index === 1 ? 2 : undefined,
      genres: index === 5 ? ["Jazz"] : [],
      styles:
        index === 1
          ? ["Ambient"]
          : index === 2
            ? ["Ambient", "Jazz-Funk"]
            : index === 5
              ? []
              : ["Jazz-Funk"],
    },
  }));
  await page.route("**/api/discogs?*", (route) =>
    route.fulfill({
      json: {
        data: { pagination: { pages: 1, items: releases.length }, releases },
        expiresAt: Date.now() + 300000,
      },
    }),
  );
  rememberYear(2, null);
  let yearResolved = false;
  await page.route("**/api/discogs?kind=master&id=6", (route) => {
    yearResolved = true;
    return route.fulfill({
      json: { data: { year: 2014 }, expiresAt: Date.now() + 300000 },
    });
  });
  let pickRequests = 0;
  let releaseInitialPicks!: () => void;
  const initialPicks = new Promise<void>((resolve) => {
    releaseInitialPicks = resolve;
  });
  let browserCatalogRequests = 0;
  page.on("request", (request) => {
    if (new URL(request.url()).pathname === "/api/spotify/catalog")
      browserCatalogRequests++;
  });
  await page.route("**/api/spotify/recent*", async (route) => {
    pickRequests++;
    const params = new URL(route.request().url()).searchParams;
    if (pickRequests <= 2)
      assert.equal(params.get("refresh"), pickRequests === 1 ? null : "1");
    assert.equal(params.get("username"), pickRequests === 3 ? "tosker" : null);
    if (pickRequests === 1) await initialPicks;
    const results = await spotifyRecommendations(
      releases,
      [
        ...releases.slice(0, 2).map((entry, index) => ({
          albumId: `album${index}`,
          album: entry.basic_information.title,
          artists: entry.basic_information.artists.map(({ name }) => name),
          playedAt: "2026-11-22T16:00:00Z",
        })),
        {
          albumId: "unowned",
          album: "Unowned Album",
          artists: ["Catalog Artist"],
          playedAt: "2026-11-22T15:00:00Z",
        },
        {
          albumId: "another",
          album: "Another Unowned Album",
          artists: ["Another Catalog Artist"],
          playedAt: "2026-11-22T14:00:00Z",
        },
      ],
      { masters: yearResolved ? { 6: 2014 } : {} },
      { key: "fixture", secret: "fixture" },
      new AbortController().signal,
      async () => ({ genres: ["Jazz"], styles: ["Ambient"], year: 2012 }),
    );
    await route.fulfill({ json: results });
  });
  await page.reload();
  const exploreHelp = page.getByRole("button", {
    name: "How Explore picks work",
  });
  const buttonBounds = await exploreHelp.boundingBox();
  const bulbBounds = await exploreHelp.locator("svg").boundingBox();
  assert.ok(buttonBounds && bulbBounds);
  assert.equal(
    buttonBounds.x + buttonBounds.width / 2,
    bulbBounds.x + bulbBounds.width / 2,
  );
  await exploreHelp.click();
  const helpDialog = page.getByRole("dialog", {
    name: "How Explore picks work",
  });
  await expect(
    helpDialog.getByText("Shared genre and era.", { exact: true }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(helpDialog).toBeHidden();
  await expect(exploreHelp).toBeFocused();
  await exploreHelp.click();
  await helpDialog.getByRole("button", { name: "Close Explore help" }).click();
  await expect(helpDialog).toBeHidden();
  await exploreHelp.click();
  await page.mouse.click(4, 4);
  await expect(helpDialog).toBeHidden();
  await expect(exploreHelp).toBeFocused();
  const pickStage = page.getByTestId("explore-pick-stage");
  const idleStageHeight = (await pickStage.boundingBox())?.height;
  assert.ok(idleStageHeight && idleStageHeight < 260);
  const tuner = pickStage.getByRole("button", {
    name: "Find my picks from recent Spotify plays",
  });
  const receiver = pickStage.locator("[data-tuning]");
  const idleTuner = await receiver.boundingBox();
  const stop = receiver.getByRole("button", { name: "Stop search" });
  await expect(stop).toBeDisabled();
  await expect(receiver.getByText("Ready to tune")).toBeVisible();
  await tuner.click();
  await expect(tuner).toBeDisabled();
  await expect(stop).toBeEnabled();
  await expect(pickStage.getByRole("status")).toHaveText("Finding your picks");
  const readout = receiver.getByTestId("tuner-readout");
  const messages = [
    "Reading plays",
    "Scanning shelf",
    "Checking Discogs",
    "Matching styles",
    "Linking records",
    "Ranking picks",
  ];
  await expect(readout).toHaveText(new RegExp(`^(?:${messages.join("|")})$`));
  const firstMessage = await readout.textContent();
  const otherMessages = messages.filter((message) => message !== firstMessage);
  await expect(readout).toHaveText(
    new RegExp(`^(?:${otherMessages.join("|")})$`),
    { timeout: 7000 },
  );
  const needleMotion = () =>
    receiver.evaluate(
      (element) =>
        getComputedStyle(element.firstElementChild!, "::after").animationName,
    );
  assert.match(await needleMotion(), /seek-frequency/);
  assert.equal((await pickStage.boundingBox())?.height, idleStageHeight);
  assert.deepEqual(await receiver.boundingBox(), idleTuner);
  await page.emulateMedia({ reducedMotion: "reduce" });
  assert.equal(await needleMotion(), "none");
  await expect(readout).toHaveText("Seeking…");
  await page.emulateMedia({ reducedMotion: "no-preference" });
  releaseInitialPicks();
  const recommended = page.getByRole("region", {
    name: "Recommended from Your Collection",
  });
  const shelf = page.getByRole("region", { name: "Already On Your Shelf" });
  await expect(shelf.getByRole("article")).toHaveCount(2);
  await expect(
    shelf.getByRole("heading", { name: "Recent A", exact: true }),
  ).toBeVisible();
  await expect(shelf.getByRole("link")).toHaveCount(0);
  await expect(shelf.getByText("Based on", { exact: false })).toHaveCount(0);
  await expect(
    shelf.getByText(
      "You've been listening to these on Spotify and they are in your collection",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(recommended.getByRole("article")).toHaveCount(5);
  await expect(
    page.getByText("Find your next spin from recent plays.", { exact: false }),
  ).toHaveCount(0);
  const exploreHeading = await page
    .getByRole("heading", { name: "Explore", exact: true })
    .boundingBox();
  const refreshControl = await page
    .getByRole("button", { name: "Refresh picks" })
    .boundingBox();
  assert.ok(exploreHeading && refreshControl);
  assert.ok(
    Math.abs(
      exploreHeading.y +
        exploreHeading.height / 2 -
        refreshControl.y -
        refreshControl.height / 2,
    ) < 1,
  );

  const supported = recommended.getByRole("article", {
    name: "Why we picked Both Styles",
  });
  await expect(
    supported.getByRole("heading", {
      name: "Based on 4 recently played albums",
    }),
  ).toBeVisible();
  await expect(
    supported.getByRole("link", { name: "Recent A", exact: true }),
  ).toBeVisible();
  await expect(
    supported.getByRole("link", { name: "Recent B", exact: true }),
  ).toBeVisible();
  await expect(
    supported.getByText("Shared Discogs style: Ambient", { exact: true }),
  ).toHaveCount(2);
  await expect(
    supported.getByRole("link", { name: "Unowned Album", exact: true }),
  ).toBeVisible();
  const nextSources = supported.getByRole("button", {
    name: "Next supporting albums",
  });
  const previousSources = supported.getByRole("button", {
    name: "Previous supporting albums",
  });
  await expect(supported.getByRole("listitem")).toHaveCount(3);
  await expect(previousSources).toBeDisabled();
  await expect(supported.getByRole("status")).toHaveText("1–3 of 4");
  const sourceReason = supported
    .getByText("Shared Discogs style: Ambient", { exact: true })
    .first();
  const reasonSize = await sourceReason.evaluate((element) => ({
    height: element.getBoundingClientRect().height,
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight),
  }));
  assert.ok(Math.abs(reasonSize.height - 2 * reasonSize.lineHeight) < 1);
  const sourceList = supported.getByRole("list");
  const firstPageHeight = (await sourceList.boundingBox())?.height;
  assert.ok(firstPageHeight);
  await nextSources.click();
  await expect(supported.getByRole("listitem")).toHaveCount(1);
  await expect(
    supported.getByRole("link", { name: "Another Unowned Album" }),
  ).toBeVisible();
  await expect(supported.getByRole("status")).toHaveText("4 of 4");
  await expect(nextSources).toBeDisabled();
  assert.equal((await sourceList.boundingBox())?.height, firstPageHeight);
  await previousSources.click();
  await expect(supported.getByRole("listitem")).toHaveCount(3);
  assert.equal(pickRequests, 1);
  assert.equal(browserCatalogRequests, 0);
  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(page).toHaveURL(baseURL + "/collection");
  await connectionsTab.click();
  await expect(page).toHaveURL(baseURL + "/spotify");
  await expect(recommended.getByRole("article")).toHaveCount(5);
  await expect(
    page.getByRole("button", { name: "Refresh picks" }),
  ).toBeVisible();
  assert.equal(pickRequests, 1);
  const moreMatches = recommended.getByRole("button", {
    name: "Show all matches",
  });
  await expect(moreMatches).toHaveCount(0);
  const resolveYears = page.getByRole("button", {
    name: "Resolve missing years",
  });
  await expect(resolveYears).toBeHidden();
  const yearAlert = page.getByText("1 album to check", { exact: true });
  await expect(yearAlert).toBeVisible();
  await page.getByText("Original release years", { exact: true }).click();
  await resolveYears.click();
  await expect(page.getByText("Original year lookup complete")).toBeVisible();
  await expect(yearAlert).toHaveCount(0);
  await page.getByRole("button", { name: "Refresh picks" }).click();
  await recommended.getByRole("button", { name: "Show all matches" }).click();
  await expect(recommended.getByRole("article")).toHaveCount(6);
  await expect(moreMatches).toHaveCount(0);
  assert.equal(pickRequests, 2);
  const eraPick = recommended.getByRole("article", {
    name: "Why we picked Pick 4",
  });
  await expect(eraPick.getByText("2014", { exact: true })).toBeVisible();
  const source = eraPick.getByRole("listitem").filter({
    has: page.getByRole("link", { name: "Unowned Album", exact: true }),
  });
  await expect(source.getByText("2012", { exact: true })).toBeVisible();
  await expect(
    source.getByText("Shared genre: Jazz", { exact: true }),
  ).toBeVisible();

  await settings.click();
  await page
    .getByRole("textbox", { name: "Public Discogs username" })
    .fill("tosker");
  await page.getByRole("button", { name: "Load collection" }).click();
  await expect(recommended).toBeHidden();
  await expect(tuner).toBeEnabled();
  await tuner.click();
  await expect(
    page.getByRole("heading", { name: "Recommended from tosker’s collection" }),
  ).toBeVisible();
  await settings.click();
  await page
    .getByRole("button", { name: "Remove tosker and use my collection" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Recommended from tosker’s collection" }),
  ).toBeHidden();
  await settings.click();
  await expect(tuner).toBeEnabled();
  await tuner.click();
  await expect(recommended).toBeVisible();
  assert.equal(pickRequests, 4);

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
