import { database } from "./db";
import { randomUUID } from "node:crypto";

export function createAttempt(expires: number) {
  const db = database();
  const id = randomUUID();
  db.prepare("DELETE FROM oauth_attempts WHERE expires <= ?").run(Date.now());
  db.prepare("INSERT INTO oauth_attempts VALUES (?,?)").run(id, expires);
  return id;
}

export function consumeAttempt(id: string) {
  const db = database();
  return db.transaction(() => {
    db.prepare("DELETE FROM oauth_attempts WHERE expires <= ?").run(Date.now());
    return (
      db
        .prepare("DELETE FROM oauth_attempts WHERE id = ? AND expires > ?")
        .run(id, Date.now()).changes === 1
    );
  })();
}
