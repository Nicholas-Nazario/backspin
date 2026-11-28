import type Database from "better-sqlite3";

export function blockedAlbumKeys(db: Database.Database, userId: number) {
  const rows = db
    .prepare(
      "SELECT work_key FROM blocked_albums WHERE user_id = ? ORDER BY work_key",
    )
    .all(userId) as { work_key: string }[];
  return rows.map(({ work_key }) => work_key);
}

export function setAlbumBlocked(
  db: Database.Database,
  userId: number,
  workKey: string,
  blocked: boolean,
) {
  db.prepare(
    blocked
      ? "INSERT OR IGNORE INTO blocked_albums (user_id, work_key) VALUES (?, ?)"
      : "DELETE FROM blocked_albums WHERE user_id = ? AND work_key = ?",
  ).run(userId, workKey);
}
