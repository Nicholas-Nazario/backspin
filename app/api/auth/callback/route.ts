import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { oauthToken, request } from "../../../../lib/discogs";
import {
  cookieOptions,
  origin,
  seal,
  unseal,
  handshakeSchema,
} from "../../../../lib/session";
import { consumeAttempt } from "../../../../lib/oauth-attempts";
import { z } from "zod";
export async function GET(req: Request) {
  const response = NextResponse.redirect(
    origin() + "/?error=authorization",
    303,
  );
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.cookies.set("mdj_handshake", "", { ...cookieOptions, maxAge: 0 });
  try {
    const raw = (await cookies()).get("mdj_handshake")?.value;
    const parsed = handshakeSchema.safeParse(raw ? unseal(raw) : null);
    if (!parsed.success) return response;
    const h = parsed.data,
      u = new URL(req.url);
    if (h.expires <= Date.now() || !consumeAttempt(h.id)) return response;
    if (
      u.searchParams.get("oauth_token") !== h.token.key ||
      !u.searchParams.get("oauth_verifier")
    )
      return response;
    const token = await oauthToken("/oauth/access_token", h.token, {
      oauth_verifier: u.searchParams.get("oauth_verifier")!,
    });
    const identity = z
      .object({ id: z.number(), username: z.string().min(1) })
      .parse(await (await request("/oauth/identity", token)).json());
    response.headers.set("Location", origin());
    response.cookies.set(
      "mdj_session",
      seal({
        purpose: "session",
        token,
        username: identity.username,
        userId: identity.id,
        expires: Date.now() + 8 * 3600 * 1000,
      }),
      { ...cookieOptions, maxAge: 8 * 3600 },
    );
    return response;
  } catch {
    return response;
  }
}
