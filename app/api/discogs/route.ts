import {
  clearCollectionPages,
  collectionFoldersPath,
  collectionPath,
  collectionTtl,
} from "../../../lib/discogs-collection";
import { database } from "../../../lib/db";
import { resolveMasterYear } from "../../../lib/year-data";
import { clearSpotifyPicks } from "../../../lib/spotify-picks-cache";
import {
  spotifyConnectionScope,
  spotifySession,
} from "../../../lib/spotify-session";
import { session } from "../../../lib/session";
import { json, request, UpstreamError } from "../../../lib/discogs";
const headers = { "Cache-Control": "private, no-store", Vary: "Cookie" };
export async function GET(req: Request) {
  const s = await session();
  if (!s)
    return Response.json(
      { error: "Connect your Discogs account." },
      { status: 401, headers },
    );
  const q = new URL(req.url).searchParams;
  const kind = q.get("kind") || "collection";
  const refresh = q.get("refresh") === "1";
  let startCollectionRefresh = false;
  let path: string;
  if (kind === "identity") path = "/oauth/identity";
  else if (kind === "folders") path = collectionFoldersPath(s.username);
  else if (kind === "master" && /^\d+$/.test(q.get("id") || ""))
    path = "/masters/" + q.get("id");
  else if (kind === "release" && /^\d+$/.test(q.get("id") || ""))
    path = "/releases/" + q.get("id");
  else if (kind === "collection") {
    const page = Number(q.get("page") || 1);
    if (!Number.isInteger(page) || page < 1 || page > 100000)
      return Response.json({ error: "Invalid page" }, { status: 400, headers });
    path = collectionPath(s.username, page);
    startCollectionRefresh = refresh && page === 1;
  } else
    return Response.json(
      { error: "Invalid request" },
      { status: 400, headers },
    );
  try {
    if (kind === "master") {
      const result = await resolveMasterYear(
        database(),
        Number(q.get("id")),
        async () => {
          const data = await (await request(path, s.token)).json();
          return data.year;
        },
        refresh,
      );
      return Response.json(
        {
          data: { id: result.masterId, year: result.year },
          expiresAt: result.expiresAt,
          source: result.source,
        },
        { headers },
      );
    }
    if (startCollectionRefresh) {
      clearCollectionPages(s.username, s.token);
      const spotify = await spotifySession();
      if (spotify) clearSpotifyPicks(spotifyConnectionScope(s, spotify).key);
    }
    const isCollection = kind === "collection" || kind === "folders";
    const result = await json(path, s.token, {
      refresh: isCollection && refresh,
      ttl: isCollection ? collectionTtl : undefined,
      signal: req.signal,
    });
    return Response.json(
      {
        data: result.value,
        expiresAt: result.expires,
        fetchedAt: result.fetchedAt,
      },
      { headers },
    );
  } catch (e) {
    const status = e instanceof UpstreamError ? e.status : 502;
    return Response.json(
      {
        error:
          status === 429
            ? "Discogs is rate limiting requests. Please retry shortly."
            : status === 401
              ? "Discogs authorization expired. Reconnect your account."
              : status === 403
                ? "Discogs denied access to this resource."
                : "Discogs is unavailable. Please retry.",
        upstreamStatus: status,
      },
      {
        status: status === 429 ? 429 : status === 401 ? 401 : 502,
        headers: {
          ...headers,
          ...(e instanceof UpstreamError
            ? { "Retry-After": String(e.retryAfter) }
            : {}),
        },
      },
    );
  }
}
