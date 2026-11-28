import Database from "better-sqlite3";
import { statSync } from "node:fs";
import { dirname, join } from "node:path";
import { albumKey } from "./album-matching";
import type { CatalogAlbum } from "./recent-recommendation";

export function masterIndexPath() {
  return (
    process.env.DISCOGS_MASTER_INDEX_PATH ||
    join(
      dirname(process.env.DATABASE_PATH || "./data/mystery.sqlite"),
      "discogs-masters.sqlite",
    )
  );
}

type Snapshot = {
  file: string;
  identity: string;
  db: Database.Database;
  date: string;
};
let snapshot: Snapshot | undefined;

function openSnapshot() {
  const file = masterIndexPath();
  let stat;
  try {
    stat = statSync(/* turbopackIgnore: true */ file);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
    snapshot?.db.close();
    snapshot = undefined;
    return;
  }
  const identity = [stat.dev, stat.ino, stat.size, stat.mtimeMs].join(":");
  if (snapshot?.file === file && snapshot.identity === identity)
    return snapshot;

  const db = new Database(file, { readonly: true, fileMustExist: true });
  try {
    const metadata = db.prepare("SELECT date FROM snapshot").get() as {
      date: string;
    };
    snapshot?.db.close();
    return (snapshot = { file, identity, db, date: metadata.date });
  } catch (error) {
    db.close();
    throw error;
  }
}

export function masterSnapshotDate() {
  return openSnapshot()?.date;
}

export function snapshotMasterYears(ids: number[]) {
  const current = openSnapshot();
  if (!current || !ids.length) return [];
  const rows: { masterId: number; year: number | null }[] = [];
  for (let offset = 0; offset < ids.length; offset += 500) {
    const batch = ids.slice(offset, offset + 500);
    const statement = current.db.prepare(
      "SELECT id AS masterId, year FROM masters WHERE id IN (" +
        batch.map(() => "?").join(",") +
        ")",
    );
    rows.push(...(statement.all(...batch) as typeof rows));
  }
  return rows.map((row) => ({
    ...row,
    source: "discogs-snapshot" as const,
    snapshotDate: current.date,
    expiresAt: null,
  }));
}

export function snapshotCatalogAlbum(
  title: string,
  artists: string[],
): CatalogAlbum | null | undefined {
  const current = openSnapshot();
  if (!current) return;
  const rows = current.db
    .prepare(
      "SELECT year, genres, styles FROM masters WHERE album_key = ? LIMIT 2",
    )
    .all(albumKey(title, artists)) as {
    year: number | null;
    genres: string;
    styles: string;
  }[];
  if (!rows.length) return;
  if (rows.length > 1) return null;
  const [row] = rows;
  return {
    year: row.year,
    genres: JSON.parse(row.genres),
    styles: JSON.parse(row.styles),
  };
}
