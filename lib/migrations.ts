import type Database from "better-sqlite3";
const migrations = [
  {
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS oauth_attempts(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);`,
  },
  {
    version: 2,
    sql: `CREATE TABLE IF NOT EXISTS original_years(user_id INTEGER NOT NULL, release_id INTEGER NOT NULL, year INTEGER NOT NULL CHECK(year BETWEEN 1800 AND 2200), PRIMARY KEY(user_id,release_id));`,
  },
  {
    version: 3,
    sql: `CREATE TABLE master_years(master_id INTEGER PRIMARY KEY, year INTEGER CHECK(year BETWEEN 1800 AND 2200), source TEXT NOT NULL DEFAULT 'discogs-master', fetched_at INTEGER NOT NULL, expires_at INTEGER NOT NULL);`,
  },
];
export function migrate(db: Database.Database) {
  db.exec(
    "CREATE TABLE IF NOT EXISTS schema_migrations(version INTEGER PRIMARY KEY)",
  );
  db.transaction(() => {
    for (const migration of migrations) {
      if (
        !db
          .prepare("SELECT 1 FROM schema_migrations WHERE version=?")
          .get(migration.version)
      ) {
        db.exec(migration.sql);
        db.prepare("INSERT INTO schema_migrations VALUES (?)").run(
          migration.version,
        );
      }
    }
  })();
}
