import { NextRequest, NextResponse } from "next/server";
import { cookieOptions, origin, seal, unseal } from "../../../../lib/session";
import { consumeAttempt } from "../../../../lib/oauth-attempts";
import {
  exchangeSpotifyCode,
  spotifyDisplayName,
} from "../../../../lib/spotify";
import {
  SPOTIFY_HANDSHAKE_COOKIE,
  SPOTIFY_SESSION_COOKIE,
  spotifyHandshakeSchema,
} from "../../../../lib/spotify-session";

export async function GET(req: NextRequest) {
  const raw = req.cookies.get(SPOTIFY_HANDSHAKE_COOKIE)?.value;
  const handshake = spotifyHandshakeSchema.safeParse(raw ? unseal(raw) : null);
  const returnTo = handshake.success ? handshake.data.returnTo : "/";
  const response = NextResponse.redirect(
    origin() + returnTo + "?spotify=error",
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set(SPOTIFY_HANDSHAKE_COOKIE, "", {
    ...cookieOptions,
    maxAge: 0,
  });
  try {
    if (!handshake.success) return response;
    const h = handshake.data;
    if (
      h.expires <= Date.now() ||
      req.nextUrl.searchParams.get("state") !== h.state ||
      !consumeAttempt(h.id)
    )
      return response;
    if (req.nextUrl.searchParams.get("error") === "access_denied") {
      response.headers.set("Location", origin() + returnTo + "?spotify=denied");
      return response;
    }
    const code = req.nextUrl.searchParams.get("code");
    if (!code || code.length > 8192 || req.nextUrl.searchParams.has("error"))
      return response;
    const token = await exchangeSpotifyCode(code);
    const displayName = await spotifyDisplayName(token.accessToken);
    const maxAge = Math.floor((token.expires - Date.now()) / 1000);
    if (maxAge <= 0) return response;
    response.cookies.set(
      SPOTIFY_SESSION_COOKIE,
      seal({ purpose: "spotify-session", ...token, displayName }),
      { ...cookieOptions, maxAge },
    );
    response.headers.set(
      "Location",
      origin() + returnTo + "?spotify=connected",
    );
    return response;
  } catch {
    return response;
  }
}
