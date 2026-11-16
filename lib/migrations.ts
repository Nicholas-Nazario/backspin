import type Database from "better-sqlite3";
const migrations = [
  {
    version: 1,
    sql: `CREATE TABLE IF NOT EXISTS oauth_attempts(id TEXT PRIMARY KEY, expires INTEGER NOT NULL);`,
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
