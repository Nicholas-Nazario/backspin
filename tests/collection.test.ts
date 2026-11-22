import { test } from "node:test";
import assert from "node:assert/strict";
import { Entry, Filters, explore, originalYear } from "../lib/collection";
const base: Filters = {
  query: "",
  genre: "",
  style: "",
  artist: "",
  format: "",
  era: "",
  folder: "",
  sort: "title",
  group: false,
};
const entry = (
  id: number,
  instance: number,
  master: number,
  title: string,
): Entry => ({
  id,
  instance_id: instance,
  folder_id: 2,
  basic_information: {
    title,
    master_id: master,
    artists: [{ name: "Artist" }],
    genres: ["Jazz"],
    styles: ["Soul-Jazz"],
    formats: [{ name: "Vinyl" }],
  },
});
const records = [
  entry(1, 10, 100, "First"),
  entry(2, 20, 100, "Second"),
  entry(3, 30, 0, "Third"),
];
test("era uses Discogs master years and ignores pressing dates", () => {
  const e = {
    ...records[0],
    basic_information: { ...records[0].basic_information, year: 2020 },
  };
  assert.deepEqual(originalYear(e, {}), { year: null, source: "unknown" });
  assert.deepEqual(originalYear(e, { 100: 1971 }), {
    year: 1971,
    source: "master",
  });
});
test("filters combine across query, taxonomy, format and original decade", () => {
  assert.equal(
    explore(
      records,
      {
        ...base,
        query: "artist",
        genre: "Jazz",
        style: "Soul-Jazz",
        format: "Vinyl",
        era: "1970",
        folder: "2",
      },
      { 100: 1971 },
    ).length,
    2,
  );
  assert.equal(
    explore(records, { ...base, era: "unknown" }, { 100: 1971 }).length,
    1,
  );
  assert.equal(explore(records, { ...base, genre: "Rock" }, {}).length, 0);
});
test("grouping preserves owned instances and works without masters", () => {
  const copies = [...records, { ...records[2], instance_id: 31 }];
  assert.equal(explore(copies, base, {}).length, 4);
  const groups = explore(copies, { ...base, group: true }, {});
  assert.equal(groups.length, 2);
  assert.deepEqual(
    groups.map((g) => g.length),
    [2, 2],
  );
});
test("unknown original dates sort last", () => {
  assert.equal(
    explore(records, { ...base, sort: "year" }, { 100: 1971 }).at(-1)?.[0].id,
    3,
  );
});

test("artist sort ignores leading articles and puts compilations before missing artists", () => {
  const make = (id: number, name: string, title: string) => ({
    ...entry(id, id, 0, title),
    basic_information: {
      ...entry(id, id, 0, title).basic_information,
      artists: name ? [{ name }] : [],
    },
  });
  const items = [
    make(1, "The Beatles", "Abbey Road"),
    make(2, "A Tribe Called Quest", "Low End Theory"),
    make(3, "An Artist", "Album"),
    make(4, "", "Missing"),
    make(5, "Various", "Z compilation"),
    make(6, "Various Artists", "A compilation"),
    make(7, "   ", "Also missing"),
    make(8, "Zappa", "Album"),
  ];
  assert.deepEqual(
    explore(items, { ...base, sort: "artist" }, {}).map((group) => group[0].id),
    [3, 1, 2, 8, 6, 5, 7, 4],
  );
  assert.equal(items[0].basic_information.artists[0].name, "The Beatles");
});
