import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  origin,
  sameOrigin,
  unseal,
} from "../../../../lib/session";
import { consumeAttempt } from "../../../../lib/oauth-attempts";
import {
  SPOTIFY_HANDSHAKE_COOKIE,
  SPOTIFY_SESSION_COOKIE,
  spotifyHandshakeSchema,
} from "../../../../lib/spotify-session";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new NextResponse("Invalid request", { status: 400 });
  }
  const raw = req.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)?.value;
  const pending = spotifyHandshakeSchema.safeParse(raw ? unseal(raw) : null);
  if (pending.success) consumeAttempt(pending.data.id);
  const path = form.get("returnTo") === "/collection" ? "/collection" : "/";
  const response = NextResponse.redirect(
    origin() + path + "?spotify=disconnected",
    303,
  );
  for (const name of [SPOTIFY_SESSION_COOKIE, SPOTIFY_HANDSHAKE_COOKIE]) {
    response.cookies.set(name, "", { ...cookieOptions, maxAge: 0 });
  }
  response.headers.set("Cache-Control", "no-store");
  return response;
}
