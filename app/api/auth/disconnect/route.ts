import { NextResponse } from "next/server";
import {
  cookieOptions,
  origin,
  sameOrigin,
  session,
} from "../../../../lib/session";
import { clearCache } from "../../../../lib/discogs";
export async function POST(req: Request) {
  if (!sameOrigin(req)) return new Response("Forbidden", { status: 403 });
  const s = await session();
  if (s) clearCache(s.token);
  const r = NextResponse.redirect(origin(), 303);
  for (const name of ["mdj_session", "mdj_handshake"])
    r.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  r.headers.set("Cache-Control", "no-store");
  return r;
}
