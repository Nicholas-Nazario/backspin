import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  origin,
  readDiscogsSession,
  sameOrigin,
  unseal,
} from "../../../../lib/session";
import { clearSpotifyPicks } from "../../../../lib/spotify-picks-cache";
import { consumeAttempt } from "../../../../lib/oauth-attempts";
import {
  SPOTIFY_HANDSHAKE_COOKIE,
  SPOTIFY_SESSION_COOKIE,
  readSpotifySession,
  spotifyConnectionScope,
  spotifyHandshakeSchema,
  spotifyReturnPath,
} from "../../../../lib/spotify-session";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return new NextResponse("Invalid request", { status: 400 });
  }
  const discogs = readDiscogsSession(req.cookies.get("mdj_session")?.value);
  const spotify = readSpotifySession(
    req.cookies.get(SPOTIFY_SESSION_COOKIE)?.value,
  );
  if (discogs && spotify)
    clearSpotifyPicks(spotifyConnectionScope(discogs, spotify).key);
  const raw = req.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)?.value;
  const pending = spotifyHandshakeSchema.safeParse(raw ? unseal(raw) : null);
  if (pending.success) consumeAttempt(pending.data.id);
  const path = spotifyReturnPath.safeParse(form.get("returnTo")).data ?? "/";
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
