import { blockedAlbumKeys } from "../../../../lib/blocked-albums";
import { database } from "../../../../lib/db";
import { discogsCollection } from "../../../../lib/discogs-collection";
import { UpstreamError } from "../../../../lib/discogs";
import { sameOrigin, session } from "../../../../lib/session";
import { spotifyRecentPlays } from "../../../../lib/spotify";
import {
  cacheSpotifyPicks,
  readSpotifyPicks,
} from "../../../../lib/spotify-picks-cache";
import { spotifyRecommendations } from "../../../../lib/spotify-recommendations";
import {
  spotifyConnectionScope,
  spotifySession,
} from "../../../../lib/spotify-session";
import { cachedMasterYears } from "../../../../lib/year-data";

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

  const scope = spotifyConnectionScope(discogs, spotify);
  const userId = discogs.userId;
  function eligiblePicks(
    picks: Awaited<ReturnType<typeof spotifyRecommendations>>,
  ) {
    const blocked = new Set(blockedAlbumKeys(database(), userId));
    return {
      ...picks,
      onShelf: picks.onShelf.filter(({ key }) => !blocked.has(key)),
      recommended: picks.recommended.filter(({ key }) => !blocked.has(key)),
    };
  }
  if (new URL(request.url).searchParams.get("refresh") !== "1") {
    const cached = readSpotifyPicks(scope);
    if (cached) return reply(eligiblePicks(cached));
  }

  const signal = request.signal;
  let recent: Awaited<ReturnType<typeof spotifyRecentPlays>>;
  try {
    recent = await spotifyRecentPlays(spotify.accessToken, signal);
  } catch {
    return reply(
      { error: "Spotify couldn’t load your recent plays. Try again." },
      502,
    );
  }
  if (!recent.ok) {
    if (recent.status === 401 || recent.status === 403)
      return reply(
        {
          error:
            "Reconnect Spotify in Settings. Your account also needs access to the Spotify development app.",
        },
        recent.status,
      );
    if (recent.status === 429)
      return reply(
        { error: "Spotify is limiting requests. Wait a moment and try again." },
        429,
      );
    return reply(
      { error: "Spotify couldn’t load your recent plays. Try again." },
      502,
    );
  }

  try {
    const { entries, expiresAt } = recent.plays.length
      ? await discogsCollection(discogs.username, discogs.token, signal)
      : { entries: [], expiresAt: Infinity };
    const ids = [
      ...new Set(
        entries.flatMap(({ basic_information }) =>
          basic_information.master_id ? [basic_information.master_id] : [],
        ),
      ),
    ];
    const masters = Object.fromEntries(
      cachedMasterYears(database(), ids).map(({ masterId, year }) => [
        masterId,
        year,
      ]),
    );
    const picks = await spotifyRecommendations(
      entries,
      recent.plays,
      { masters },
      discogs.token,
      signal,
    );
    signal.throwIfAborted();
    cacheSpotifyPicks(
      { ...scope, expires: Math.min(scope.expires, expiresAt) },
      picks,
    );
    return reply(eligiblePicks(picks));
  } catch (error) {
    if (error instanceof UpstreamError && error.status === 429)
      return reply(
        { error: "Discogs is limiting requests. Wait a moment and try again." },
        429,
      );
    return reply(
      {
        error: "Backspin couldn’t build picks from your collection. Try again.",
      },
      502,
    );
  }
}
