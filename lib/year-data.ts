import type Database from "better-sqlite3";
export type MasterYear = {
  masterId: number;
  year: number | null;
  source: "discogs-master";
  fetchedAt: number;
  expiresAt: number;
};
// Refresh before the upstream six-hour freshness boundary. No artwork or ownership is stored.
export const MASTER_YEAR_TTL = 5 * 60 * 60 * 1000;
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
export async function resolveMasterYear(
  db: Database.Database,
  id: number,
  fetchYear: () => Promise<unknown>,
  force = false,
  now = Date.now(),
): Promise<MasterYear> {
  if (!force) {
    const cached = cachedMasterYears(db, [id], now)[0];
    if (cached) return cached;
  }
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
