import { session } from "../../../lib/session";
import { database } from "../../../lib/db";
import { cachedMasterYears } from "../../../lib/year-data";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(req: Request) {
  if (!(await session()))
    return Response.json(
      { error: "Connect Discogs" },
      { status: 401, headers },
    );
  const values = (new URL(req.url).searchParams.get("ids") || "")
    .split(",")
    .filter(Boolean);
  if (
    values.length > 100 ||
    values.some(
      (v) =>
        !/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) <= 0,
    )
  )
    return Response.json(
      { error: "Invalid master IDs" },
      { status: 400, headers },
    );
  return Response.json(
    { years: cachedMasterYears(database(), [...new Set(values.map(Number))]) },
    { headers },
  );
}
