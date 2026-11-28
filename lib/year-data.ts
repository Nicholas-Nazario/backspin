import type Database from "better-sqlite3";
import { UpstreamError } from "./discogs";
import { discogsCacheTtl } from "./discogs-freshness";
import { snapshotMasterYears } from "./discogs-master-index";
export type MasterYear = {
  masterId: number;
  year: number | null;
  source: "discogs-master";
  fetchedAt: number;
  expiresAt: number;
};
export const MASTER_YEAR_TTL = discogsCacheTtl;
export function cachedMasterYears(
  db: Database.Database,
  ids: number[],
  now = Date.now(),
): MasterYear[] {
  db.prepare("DELETE FROM master_years WHERE expires_at <= ?").run(now);
  const read = db.prepare(
    "SELECT master_id AS masterId, year, source, fetched_at AS fetchedAt, expires_at AS expiresAt FROM master_years WHERE master_id=? AND expires_at>?",
  );
  return ids.flatMap((id) => {
    const row = read.get(id, now) as MasterYear | undefined;
    return row ? [row] : [];
  });
}
export function availableMasterYears(db: Database.Database, ids: number[]) {
  const indexed = snapshotMasterYears(ids);
  const present = new Set(indexed.map(({ masterId }) => masterId));
  return [
    ...indexed,
    ...cachedMasterYears(
      db,
      ids.filter((id) => !present.has(id)),
    ),
  ];
}
export async function resolveMasterYear(
  db: Database.Database,
  id: number,
  fetchYear: () => Promise<unknown>,
): Promise<MasterYear> {
  const cached = cachedMasterYears(db, [id])[0];
  if (cached) return cached;
  const raw = await fetchYear();
  const value = Number(raw);
  const year =
    Number.isInteger(value) && value >= 1800 && value <= 2200 ? value : null;
  const fetchedAt = Date.now(),
    expiresAt = fetchedAt + MASTER_YEAR_TTL;
  db.prepare(
    "INSERT INTO master_years(master_id,year,source,fetched_at,expires_at) VALUES(?,?,'discogs-master',?,?) ON CONFLICT(master_id) DO UPDATE SET year=excluded.year,fetched_at=excluded.fetched_at,expires_at=excluded.expires_at",
  ).run(id, year, fetchedAt, expiresAt);
  return { masterId: id, year, source: "discogs-master", fetchedAt, expiresAt };
}

export async function resolveMissingMasterYears(
  db: Database.Database,
  ids: number[],
  fetchYear: (id: number) => Promise<unknown>,
  signal: AbortSignal,
) {
  const years = availableMasterYears(db, ids);
  const present = new Set(years.map(({ masterId }) => masterId));
  let failures = 0;
  let retryAfter: number | undefined;
  for (const id of ids) {
    signal.throwIfAborted();
    if (present.has(id)) continue;
    try {
      years.push(await resolveMasterYear(db, id, () => fetchYear(id)));
    } catch (error) {
      signal.throwIfAborted();
      failures++;
      if (error instanceof UpstreamError && error.status === 429) {
        retryAfter = error.retryAfter;
        break;
      }
    }
  }
  return { years, failures, retryAfter };
}
