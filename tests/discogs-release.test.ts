import assert from "node:assert/strict";
import test from "node:test";
import { clearAccountCache } from "../lib/discogs-cache";
import { discogsCacheTtl } from "../lib/discogs-freshness";
import { discogsRelease } from "../lib/discogs-release";

test("edition details are shared across accounts and refetched at expiry", async (t) => {
  process.env.DISCOGS_CONSUMER_KEY = "fixture";
  process.env.DISCOGS_CONSUMER_SECRET = "fixture";
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const fetch = t.mock.method(globalThis, "fetch", async () =>
    Response.json({ genres: ["Jazz"], images: [{ uri: "fixture" }] }),
  );
  const firstToken = { key: "first", secret: "fixture" };
  const secondToken = { key: "second", secret: "fixture" };
  const signal = new AbortController().signal;

  const edition = await discogsRelease("123", firstToken, signal);
  assert.deepEqual(edition.value, { genres: ["Jazz"] });
  clearAccountCache(firstToken);
  assert.deepEqual(await discogsRelease("123", secondToken, signal), edition);
  assert.equal(fetch.mock.callCount(), 1);

  now += discogsCacheTtl;
  const refreshed = await discogsRelease("123", secondToken, signal);
  assert.equal(refreshed.fetchedAt, now);
  assert.equal(fetch.mock.callCount(), 2);
});
