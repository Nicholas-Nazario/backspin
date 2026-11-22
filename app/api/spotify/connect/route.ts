import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  cookieOptions,
  origin,
  sameOrigin,
  seal,
} from "../../../../lib/session";
import { createAttempt } from "../../../../lib/oauth-attempts";
import { spotifyAuthorizationUrl } from "../../../../lib/spotify";
import {
  SPOTIFY_HANDSHAKE_COOKIE,
  spotifyReturnPath,
} from "../../../../lib/spotify-session";

export async function POST(req: NextRequest) {
  if (!sameOrigin(req)) return new NextResponse("Forbidden", { status: 403 });
  let returnTo = "/";
  try {
    const form = await req.formData();
    returnTo = spotifyReturnPath.safeParse(form.get("returnTo")).data ?? "/";
    const state = randomBytes(32).toString("base64url");
    const authorize = spotifyAuthorizationUrl(state);
    const expires = Date.now() + 10 * 60 * 1000;
    const id = createAttempt(expires);
    const response = NextResponse.redirect(authorize, 303);
    response.cookies.set(
      SPOTIFY_HANDSHAKE_COOKIE,
      seal({ purpose: "spotify-handshake", id, state, returnTo, expires }),
      { ...cookieOptions, maxAge: 600 },
    );
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch {
    const response = NextResponse.redirect(
      origin() + returnTo + "?spotify=unavailable",
      303,
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  }
}
