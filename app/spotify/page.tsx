import { session } from "../../lib/session";
import {
  spotifyConnectionScope,
  spotifySession,
} from "../../lib/spotify-session";
import { AppShell } from "../components/app-shell";
import { SpotifyPicks } from "./spotify-picks";

export const metadata = { title: "Explore · Backspin" };

export default async function SpotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const [{ spotify }, discogs, listening] = await Promise.all([
    searchParams,
    session(),
    spotifySession(),
  ]);
  const connection =
    discogs && listening ? spotifyConnectionScope(discogs, listening) : null;
  return (
    <AppShell active="spotify" spotifyResult={spotify}>
      <SpotifyPicks key={connection?.key} connection={connection} />
    </AppShell>
  );
}
