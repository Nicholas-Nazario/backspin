import { blockedAlbumKeys } from "../../../../lib/blocked-albums";
import { database } from "../../../../lib/db";
import {
  discogsCollection,
  isDiscogsCollectionUsername,
} from "../../../../lib/discogs-collection";
import { masterSnapshotDate } from "../../../../lib/discogs-master-index";
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
import { availableMasterYears } from "../../../../lib/year-data";

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

  const params = new URL(request.url).searchParams;
  const username = params.get("username");
  if (username !== null && !isDiscogsCollectionUsername(username))
    return reply({ error: "Enter a valid Discogs username." }, 400);

  const collectionUsername = username ?? discogs.username;
  const scope = {
    ...spotifyConnectionScope(discogs, spotify),
    collectionUsername,
    snapshotDate: masterSnapshotDate(),
  };
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
  const started = performance.now();
  let stage = "cacheMs";
  let stageStarted = started;
  const timings: Record<string, number> = {};
  const catalogTimings = {
    snapshotMs: 0,
    snapshotMatches: 0,
    snapshotMisses: 0,
    snapshotAmbiguous: 0,
    liveDiscogsMs: 0,
    liveDiscogsRequests: 0,
    liveDiscogsMatches: 0,
    liveDiscogsNoMatch: 0,
    liveDiscogsErrors: 0,
  };
  function finishStage() {
    const now = performance.now();
    timings[stage] = Math.round(now - stageStarted);
    stageStarted = now;
  }
  function measuredReply(body: object, status = 200) {
    finishStage();
    console.info(
      "spotify.explore",
      JSON.stringify({
        status,
        ...timings,
        snapshotDate: scope.snapshotDate ?? null,
        ...catalogTimings,
        snapshotMs: Math.round(catalogTimings.snapshotMs),
        liveDiscogsMs: Math.round(catalogTimings.liveDiscogsMs),
        totalMs: Math.round(performance.now() - started),
      }),
    );
    return reply(body, status);
  }
  if (params.get("refresh") !== "1") {
    const cached = readSpotifyPicks(scope);
    if (cached) return measuredReply(eligiblePicks(cached));
  }

  finishStage();
  stage = "spotifyMs";
  const signal = request.signal;
  let recent: Awaited<ReturnType<typeof spotifyRecentPlays>>;
  try {
    recent = await spotifyRecentPlays(spotify.accessToken, signal);
  } catch {
    return measuredReply(
      { error: "Spotify couldn’t load your recent plays. Try again." },
      502,
    );
  }
  if (!recent.ok) {
    if (recent.status === 401 || recent.status === 403)
      return measuredReply(
        {
          error:
            "Reconnect Spotify in Settings. Your account also needs access to the Spotify development app.",
        },
        recent.status,
      );
    if (recent.status === 429)
      return measuredReply(
        { error: "Spotify is limiting requests. Wait a moment and try again." },
        429,
      );
    return measuredReply(
      { error: "Spotify couldn’t load your recent plays. Try again." },
      502,
    );
  }

  finishStage();
  stage = "shelfMs";
  try {
    const { entries, expiresAt } = recent.plays.length
      ? await discogsCollection(collectionUsername, discogs.token, signal)
      : { entries: [], expiresAt: Infinity };
    finishStage();
    stage = "matchingMs";
    const ids = [
      ...new Set(
        entries.flatMap(({ basic_information }) =>
          basic_information.master_id ? [basic_information.master_id] : [],
        ),
      ),
    ];
    const masters = Object.fromEntries(
      availableMasterYears(database(), ids).map(({ masterId, year }) => [
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
      undefined,
      catalogTimings,
    );
    signal.throwIfAborted();
    cacheSpotifyPicks(
      { ...scope, expires: Math.min(scope.expires, expiresAt) },
      picks,
    );
    return measuredReply(eligiblePicks(picks));
  } catch (error) {
    if (
      username &&
      error instanceof UpstreamError &&
      (error.status === 403 || error.status === 404)
    )
      return measuredReply(
        {
          error: "Discogs couldn’t find a public collection for this username.",
        },
        error.status,
      );
    if (error instanceof UpstreamError && error.status === 429)
      return measuredReply(
        { error: "Discogs is limiting requests. Wait a moment and try again." },
        429,
      );
    return measuredReply(
      {
        error: "Backspin couldn’t build picks from this collection. Try again.",
      },
      502,
    );
  }
}
