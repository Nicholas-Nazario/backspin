import { session } from "../../../lib/session";
import { database } from "../../../lib/db";
import { request } from "../../../lib/discogs";
import {
  availableMasterYears,
  resolveMissingMasterYears,
} from "../../../lib/year-data";
import {
  masterYearLiveBatchSize,
  masterYearReadBatchSize,
} from "../../../lib/master-year-batch";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(req: Request) {
  const account = await session();
  if (!account)
    return Response.json(
      { error: "Connect Discogs" },
      { status: 401, headers },
    );
  const params = new URL(req.url).searchParams;
  const resolve = params.get("resolve") === "1";
  const values = (params.get("ids") || "").split(",").filter(Boolean);
  if (
    values.length >
      (resolve ? masterYearLiveBatchSize : masterYearReadBatchSize) ||
    values.some(
      (v) =>
        !/^\d+$/.test(v) || !Number.isSafeInteger(Number(v)) || Number(v) <= 0,
    )
  )
    return Response.json(
      { error: "Invalid master IDs" },
      { status: 400, headers },
    );
  const ids = [...new Set(values.map(Number))];
  const db = database();
  if (!resolve)
    return Response.json({ years: availableMasterYears(db, ids) }, { headers });
  const result = await resolveMissingMasterYears(
    db,
    ids,
    async (id) => {
      const response = await request(
        "/masters/" + id,
        account.token,
        "GET",
        {},
        fetch,
        req.signal,
      );
      return (await response.json()).year;
    },
    req.signal,
  );
  return Response.json(result, {
    headers: result.retryAfter
      ? { ...headers, "Retry-After": String(result.retryAfter) }
      : headers,
  });
}
