import assert from "node:assert/strict";
import test from "node:test";
import { findDiscogsAlbum } from "../lib/discogs-album";
import { discogsCacheTtl } from "../lib/discogs-freshness";
import { resetScheduler } from "../lib/discogs";

test("catalog search accepts unique matching masters and rejects ambiguous or unrelated results", async (t) => {
  process.env.DISCOGS_CONSUMER_KEY = "fixture";
  process.env.DISCOGS_CONSUMER_SECRET = "fixture";
  let now = Date.now();
  t.mock.method(Date, "now", () => now);
  const match = {
    id: 1,
    type: "master",
    title: "Kendrick Lamar - Good Kid, M.A.A.D City",
    genre: ["Hip Hop"],
    style: ["Conscious"],
    year: "2012",
  };
  let requests = 0;
  async function lookup(results: unknown[], key = "fixture") {
    resetScheduler();
    return findDiscogsAlbum(
      "good kid, m.A.A.d city (Deluxe)",
      ["Kendrick Lamar"],
      { key, secret: "fixture" },
      new AbortController().signal,
      async (input) => {
        requests++;
        const url = new URL(String(input));
        assert.equal(url.searchParams.get("type"), "master");
        assert.doesNotMatch(url.searchParams.get("q")!, /deluxe/i);
        return Response.json({ results });
      },
    );
  }
  const unrelated = {
    ...match,
    id: 2,
    title: "Someone Else - Good Kid, M.A.A.D City",
  };
  assert.deepEqual(await lookup([unrelated, match]), {
    genres: ["Hip Hop"],
    styles: ["Conscious"],
    year: 2012,
  });
  assert.equal((await lookup([], "other-account"))?.year, 2012);
  assert.equal(requests, 1);
  now += discogsCacheTtl;
  assert.equal(await lookup([unrelated], "other-account"), null);
  assert.equal(requests, 2);
  now += discogsCacheTtl;
  assert.equal(await lookup([match, { ...match, id: 3 }], "ambiguous"), null);
});
