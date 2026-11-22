import { sameOrigin, session } from "../../../../lib/session";
import { spotifyRecentPlays } from "../../../../lib/spotify";
import { spotifySession } from "../../../../lib/spotify-session";

function reply(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request))
    return reply({ error: "Open Backspin to try again." }, 403);

  const [discogs, spotify] = await Promise.all([session(), spotifySession()]);
  if (!discogs)
    return reply({ error: "Connect Discogs in Settings first." }, 401);
  if (!spotify)
    return reply({ error: "Connect Spotify in Settings first." }, 401);

  try {
    const result = await spotifyRecentPlays(
      spotify.accessToken,
      request.signal,
    );
    if (result.ok) return reply({ plays: result.plays });
    if (result.status === 401 || result.status === 403)
      return reply(
        {
          error:
            "Reconnect Spotify in Settings. Your account also needs access to the Spotify development app.",
        },
        result.status,
      );
    if (result.status === 429)
      return reply(
        { error: "Spotify is limiting requests. Wait a moment and try again." },
        429,
      );
  } catch {
    // Keep upstream response bodies and authorization data out of errors.
  }
  return reply(
    { error: "Spotify couldn’t load your recent plays. Try again." },
    502,
  );
}
