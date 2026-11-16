import { database } from "./db";
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
