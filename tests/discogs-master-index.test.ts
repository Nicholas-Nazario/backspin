import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";
import { gzipSync } from "node:zlib";
import { UpstreamError } from "../lib/discogs";
import { openDatabase } from "../lib/db";
import { findDiscogsAlbum } from "../lib/discogs-album";
import {
  masterSnapshotDate,
  snapshotMasterYears,
} from "../lib/discogs-master-index";
import {
  availableMasterYears,
  resolveMasterYear,
  resolveMissingMasterYears,
} from "../lib/year-data";
import { importDiscogsMasters } from "../scripts/import-discogs-masters";

test("import preserves unknown masters and prefers snapshot metadata over live results", async () => {
  const directory = await mkdtemp(join(tmpdir(), "backspin-masters-"));
  const input = join(directory, "masters.xml.gz");
  const output = join(directory, "masters.sqlite");
  const previousPath = process.env.DISCOGS_MASTER_INDEX_PATH;
  process.env.DISCOGS_MASTER_INDEX_PATH = output;
  const db = openDatabase(":memory:");
  try {
    const xml = `<masters>
      <master id="1">
        <title>Écho &amp; Tape</title><year>1985</year><main_release>11</main_release>
        <artists><artist><name>Example (2)</name></artist></artists>
        <genres><genre>Electronic</genre></genres><styles><style>Ambient</style></styles>
        <videos><video><title>Ignore this title</title></video></videos>
      </master>
      <master id="2"><title>Missing year</title><artists><artist><name>Example</name></artist></artists></master>
      <master id="3"><title>Ambiguous</title><artists><artist><name>Example</name></artist></artists></master>
      <master id="4"><title>Ambiguous</title><artists><artist><name>Example (2)</name></artist></artists></master>
    </masters>`;
    await writeFile(input, gzipSync(xml));
    assert.equal(await importDiscogsMasters(input, output, "20261101"), 4);
    await resolveMasterYear(db, 2, async () => 1995);
    await resolveMasterYear(db, 5, async () => 2005);
    assert.deepEqual(
      availableMasterYears(db, [1, 2, 5, 6]).map(
        ({ masterId, year, source }) => [masterId, year, source],
      ),
      [
        [1, 1985, "discogs-snapshot"],
        [2, null, "discogs-snapshot"],
        [5, 2005, "discogs-master"],
      ],
    );

    const requested: number[] = [];
    const partial = await resolveMissingMasterYears(
      db,
      [1, 2, 5, 6, 7, 8],
      async (id) => {
        requested.push(id);
        if (id === 7) throw new UpstreamError(429, 30);
        return 2006;
      },
      new AbortController().signal,
    );
    assert.deepEqual(requested, [6, 7]);
    assert.equal(partial.retryAfter, 30);
    assert.equal(partial.failures, 1);
    assert.deepEqual(
      partial.years.map(({ masterId, year }) => [masterId, year]),
      [
        [1, 1985],
        [2, null],
        [5, 2005],
        [6, 2006],
      ],
    );

    const token = { key: "fixture", secret: "fixture" };
    const signal = new AbortController().signal;
    const unexpectedFetch: typeof fetch = async () => {
      assert.fail(
        "Present or ambiguous snapshot matches should use no live request",
      );
    };
    assert.deepEqual(
      await findDiscogsAlbum(
        "Echo & Tape (Deluxe)",
        ["Example"],
        token,
        signal,
        unexpectedFetch,
      ),
      {
        year: 1985,
        genres: ["Electronic"],
        styles: ["Ambient"],
      },
    );
    assert.deepEqual(
      await findDiscogsAlbum(
        "Missing year",
        ["Example"],
        token,
        signal,
        unexpectedFetch,
      ),
      {
        year: null,
        genres: [],
        styles: [],
      },
    );
    assert.equal(
      await findDiscogsAlbum(
        "Ambiguous",
        ["Example"],
        token,
        signal,
        unexpectedFetch,
      ),
      null,
    );

    await writeFile(input, gzipSync('<masters><master id="9">'));
    await assert.rejects(importDiscogsMasters(input, output, "20261201"));
    assert.equal(masterSnapshotDate(), "20261101");

    await writeFile(input, gzipSync(xml.replace("1985", "1986")));
    await importDiscogsMasters(input, output, "20261201");
    assert.equal(masterSnapshotDate(), "20261201");
    assert.equal(snapshotMasterYears([1])[0].year, 1986);
  } finally {
    db.close();
    if (previousPath === undefined)
      delete process.env.DISCOGS_MASTER_INDEX_PATH;
    else process.env.DISCOGS_MASTER_INDEX_PATH = previousPath;
    masterSnapshotDate();
    await rm(directory, { recursive: true, force: true });
  }
});
