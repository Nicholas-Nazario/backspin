import Database from "better-sqlite3";
import { createReadStream } from "node:fs";
import { mkdtemp, rename, rm } from "node:fs/promises";
import { dirname, join } from "node:path";
import { createGunzip } from "node:zlib";
import { pipeline } from "node:stream/promises";
import { pathToFileURL } from "node:url";
import { StringDecoder } from "node:string_decoder";
import { SaxesParser } from "saxes";
import { albumKey, artistKeys } from "../lib/album-matching";
import { masterIndexPath } from "../lib/discogs-master-index";

type Master = {
  id: number;
  title: string;
  year: number | null;
  artists: string[];
  genres: string[];
  styles: string[];
};

function positiveInteger(value: string) {
  const number = Number(value);
  return Number.isSafeInteger(number) && number > 0 ? number : null;
}

export async function importDiscogsMasters(
  input: string,
  output: string,
  date: string,
) {
  if (!/^\d{8}$/.test(date))
    throw new Error("Expected a snapshot date in YYYYMMDD format");
  const tempDirectory = await mkdtemp(
    join(dirname(output), ".discogs-masters-"),
  );
  const tempFile = join(tempDirectory, "masters.sqlite");
  let db: Database.Database | undefined;
  try {
    const index = (db = new Database(tempFile));
    index.exec(`
      PRAGMA journal_mode = OFF;
      PRAGMA synchronous = OFF;
      CREATE TABLE snapshot (date TEXT NOT NULL);
      CREATE TABLE masters (
        id INTEGER PRIMARY KEY, year INTEGER, genres TEXT NOT NULL,
        styles TEXT NOT NULL, album_key TEXT
      );
    `);
    const insert = index.prepare("INSERT INTO masters VALUES (?, ?, ?, ?, ?)");
    const batch: Master[] = [];
    const flush = index.transaction(() => {
      for (const master of batch)
        insert.run(
          master.id,
          master.year,
          JSON.stringify(master.genres),
          JSON.stringify(master.styles),
          master.title && artistKeys(master.artists).length
            ? albumKey(master.title, master.artists)
            : null,
        );
      batch.length = 0;
    });

    const parser = new SaxesParser();
    const parents: string[] = [];
    let current: Master | undefined;
    let field = "";
    let value = "";
    let count = 0;
    parser.on("doctype", () => {
      throw new Error("Unexpected XML doctype");
    });
    parser.on("opentag", ({ name, attributes }) => {
      parents.push(name);
      const path = parents.join("/");
      if (path === "masters/master") {
        const id = positiveInteger(attributes.id ?? "");
        if (!id) throw new Error("Invalid Discogs master ID");
        current = {
          id,
          title: "",
          year: null,
          artists: [],
          genres: [],
          styles: [],
        };
      } else if (
        current &&
        [
          "masters/master/title",
          "masters/master/year",
          "masters/master/artists/artist/name",
          "masters/master/genres/genre",
          "masters/master/styles/style",
        ].includes(path)
      ) {
        field = name;
        value = "";
      }
    });
    function append(text: string) {
      if (field) value += text;
    }
    parser.on("text", append);
    parser.on("cdata", append);
    parser.on("closetag", ({ name }) => {
      if (current && field === name) {
        const text = value.trim();
        if (field === "title") current.title = text;
        if (field === "year") {
          const year = positiveInteger(text);
          current.year = year && year >= 1800 && year <= 2200 ? year : null;
        }
        if (field === "name" && text) current.artists.push(text);
        if (field === "genre" && text) current.genres.push(text);
        if (field === "style" && text) current.styles.push(text);
        field = "";
      }
      if (current && parents.length === 2 && name === "master") {
        batch.push(current);
        current = undefined;
        count++;
        if (batch.length >= 5000) flush();
      }
      parents.pop();
    });
    const decoder = new StringDecoder("utf8");
    await pipeline(createReadStream(input), createGunzip(), async (chunks) => {
      for await (const chunk of chunks) parser.write(decoder.write(chunk));
      parser.write(decoder.end()).close();
    });

    if (!count) throw new Error("The snapshot contains no masters");
    flush();
    index.exec("CREATE INDEX masters_album_key ON masters(album_key)");
    index.prepare("INSERT INTO snapshot VALUES (?)").run(date);
    if (index.pragma("integrity_check", { simple: true }) !== "ok")
      throw new Error("SQLite integrity check failed");
    index.close();
    db = undefined;
    await rename(tempFile, output);
    return count;
  } finally {
    db?.close();
    await rm(tempDirectory, { recursive: true, force: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const [date, input, output = masterIndexPath()] = process.argv.slice(2);
  if (!date || !input)
    throw new Error(
      "Usage: import-discogs-masters YYYYMMDD masters.xml.gz [output.sqlite]",
    );
  console.log(
    `Imported ${await importDiscogsMasters(input, output, date)} Discogs masters`,
  );
}
