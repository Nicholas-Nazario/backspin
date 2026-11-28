import { chromium, expect } from "@playwright/test";
import { collectionFixture } from "./browser-fixture";

const baseURL = process.env.BACKSPIN_TEST_URL || "http://localhost:3000";
const browser = await chromium.launch();
try {
  const { page } = await collectionFixture(browser, baseURL);
  const basic_information = {
    title: "Comedy Album",
    master_id: 42,
    artists: [{ name: "Fixture Comedian" }],
  };
  const releases = [10, 11].map((id) => ({
    id,
    instance_id: id,
    basic_information,
  }));
  await page.route("**/api/discogs?*", (route) => {
    const kind = new URL(route.request().url()).searchParams.get("kind");
    return route.fulfill({
      json: {
        data:
          kind === "folders"
            ? { folders: [] }
            : kind === "release"
              ? basic_information
              : { pagination: { pages: 1, items: releases.length }, releases },
        expiresAt: Date.now() + 300000,
        fetchedAt: Date.now(),
      },
    });
  });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const toggles = page.getByRole("button", {
    name: "Block recommendations for Comedy Album",
  });
  const toggle = toggles.first();
  await page.goto(baseURL + "/collection");
  await expect(toggle).toHaveAttribute("title", "Recommendations allowed");
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.click();
  await expect(toggle).toHaveAttribute("title", "Recommendations blocked");
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await expect(toggles.last()).toHaveAttribute(
    "title",
    "Recommendations blocked",
  );

  await page.getByRole("link", { name: "Surprise Me" }).click();
  await expect(
    page.getByText("All your albums are blocked.", { exact: false }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Collection", exact: true }).click();
  await expect(toggle).toHaveAttribute("title", "Recommendations blocked");
  await toggle.click();
  await expect(toggle).toHaveAttribute("title", "Recommendations allowed");
  await expect(toggle).toBeEnabled();

  await page.goto(baseURL);
  await page
    .getByRole("button", { name: "Drop the needle", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Comedy Album" }),
  ).toBeVisible();
} finally {
  await browser.close();
}
