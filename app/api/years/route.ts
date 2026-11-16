import { session, sameOrigin } from "../../../lib/session";
import { personalYears, correctYear } from "../../../lib/year-data";
import { database } from "../../../lib/db";
import { z } from "zod";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET() {
  const s = await session();
  if (!s)
    return Response.json(
      { error: "Connect Discogs" },
      { status: 401, headers },
    );
  return Response.json(
    { years: personalYears(database(), s.userId) },
    { headers },
  );
}
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const s = await session();
  if (!s) return new Response("Unauthorized", { status: 401, headers });
  const parsed = z
    .object({
      releaseId: z.number().int().positive(),
      year: z.number().int().min(1800).max(2200).nullable(),
    })
    .safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    return Response.json(
      { error: "Enter a year between 1800 and 2200." },
      { status: 400, headers },
    );
  const { releaseId, year } = parsed.data;
  correctYear(database(), s.userId, releaseId, year);
  return Response.json({ ok: true }, { headers });
}
