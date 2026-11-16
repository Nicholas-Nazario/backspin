import { migrate } from "./migrations";
import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
export function openDatabase(
  path = process.env.DATABASE_PATH || "./data/mystery.sqlite",
) {
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("busy_timeout = 5000");
  migrate(db);
  return db;
}
let singleton: ReturnType<typeof openDatabase> | undefined;
export function database() {
  return (singleton ??= openDatabase());
}
