import { z } from "zod";
import { origin } from "./session";

export function spotifyConfiguration() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!clientId || !clientSecret || !process.env.SESSION_KEY) return null;

  let base: URL;
  try {
    base = new URL(origin());
  } catch {
    return null;
  }
  if (base.hostname === "localhost") return null;
  const loopback = ["127.0.0.1", "[::1]"].includes(base.hostname);
  if (base.protocol !== "https:" && !(base.protocol === "http:" && loopback))
    return null;

  return {
    clientId,
    clientSecret,
    redirectUri: new URL("/api/spotify/callback", base).href,
  };
}

export function spotifyAuthorizationUrl(state: string) {
  const config = spotifyConfiguration();
  if (!config) throw new Error("Spotify connection is not configured");
  const url = new URL("https://accounts.spotify.com/authorize");
  url.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: config.redirectUri,
    state,
    scope: "user-read-private user-read-recently-played",
  }).toString();
  return url.href;
}

export async function exchangeSpotifyCode(
  code: string,
  fetcher: typeof fetch = fetch,
) {
  const config = spotifyConfiguration();
  if (!config) throw new Error("Spotify connection is not configured");
  const response = await fetcher("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${config.clientId}:${config.clientSecret}`).toString(
          "base64",
        ),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: config.redirectUri,
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Spotify authorization failed");
  const token = z
    .object({
      access_token: z.string().min(1).max(2048),
      token_type: z.literal("Bearer"),
      expires_in: z.number().int().positive(),
    })
    .parse(await response.json());
  // Keep the connection bounded by the access token lifetime.
  return {
    accessToken: token.access_token,
    expires: Date.now() + Math.min(token.expires_in, 8 * 3600) * 1000,
  };
}

export async function spotifyDisplayName(
  accessToken: string,
  fetcher: typeof fetch = fetch,
) {
  const response = await fetcher("https://api.spotify.com/v1/me", {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error("Spotify profile could not be loaded");
  const profile = z
    .object({ display_name: z.string().max(200).nullable() })
    .parse(await response.json());
  return profile.display_name?.trim() || "Spotify listener";
}

const recentPlay = z.object({
  played_at: z.iso.datetime({ offset: true }),
  track: z.object({
    album: z.object({
      id: z.string().regex(/^[a-zA-Z0-9]+$/),
      name: z.string().min(1),
      artists: z.array(z.object({ name: z.string().min(1) })).min(1),
      images: z.array(z.object({ url: z.string() })).optional(),
    }),
  }),
});

export async function spotifyRecentPlays(
  accessToken: string,
  signal: AbortSignal,
) {
  const response = await fetch(
    "https://api.spotify.com/v1/me/player/recently-played?limit=50",
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]),
    },
  );
  if (!response.ok) return { ok: false as const, status: response.status };

  const { items } = z
    .object({ items: z.array(z.unknown()) })
    .parse(await response.json());
  const plays = items.flatMap((item) => {
    const parsed = recentPlay.safeParse(item);
    if (!parsed.success) return [];
    const {
      played_at,
      track: { album },
    } = parsed.data;
    return [
      {
        albumId: album.id,
        album: album.name,
        artists: album.artists.map(({ name }) => name),
        playedAt: played_at,
        artworkUrl: album.images?.find(({ url }) =>
          /^https:\/\/i\.scdn\.co\/image\/[a-z0-9]+$/i.test(url),
        )?.url,
      },
    ];
  });
  if (items.length && !plays.length)
    throw new Error("Spotify play metadata unavailable");
  return { ok: true as const, plays };
}
