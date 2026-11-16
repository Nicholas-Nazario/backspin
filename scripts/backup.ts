import { openDatabase } from "../lib/db";
const destination = process.argv[2];
if (!destination)
  throw new Error(
    "Usage: npm run backup -- /off-machine-staging/backup.sqlite",
  );
const db = openDatabase();
await db.backup(destination);
db.close();
console.log(
  "Consistent database backup created. Copy it off the application machine.",
);
