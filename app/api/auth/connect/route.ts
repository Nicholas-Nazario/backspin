import { NextResponse } from "next/server";
import { oauthToken } from "../../../../lib/discogs";
import {
  cookieOptions,
  origin,
  sameOrigin,
  seal,
} from "../../../../lib/session";
import { createAttempt } from "../../../../lib/oauth-attempts";
export async function POST(req: Request) {
  if (!sameOrigin(req)) {
    console.info("Connect origin check rejected", {
      origin: req.headers.get("origin"),
      fetchSite: req.headers.get("sec-fetch-site"),
      refererOrigin: (() => {
        try {
          return new URL(req.headers.get("referer") || "").origin;
        } catch {
          return null;
        }
      })(),
      requestOrigin: new URL(req.url).origin,
      configuredOrigin: origin(),
    });
    return new Response(
      "Forbidden: connection origin could not be verified. Refresh the home page and try again.",
      { status: 403 },
    );
  }
  try {
    const token = await oauthToken("/oauth/request_token", undefined, {
      oauth_callback: origin() + "/api/auth/callback",
    });
    const expires = Date.now() + 10 * 60 * 1000;
    const id = createAttempt(expires);
    const response = NextResponse.redirect(
      "https://www.discogs.com/oauth/authorize?oauth_token=" +
        encodeURIComponent(token.key),
      303,
    );
    response.cookies.set(
      "mdj_handshake",
      seal({ purpose: "handshake", token, id, expires }),
      { ...cookieOptions, maxAge: 600 },
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.redirect(origin() + "/?error=connect", 303);
  }
}
