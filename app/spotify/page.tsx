import { AppShell } from "../components/app-shell";
import { SpotifyPicks } from "./spotify-picks";

export const metadata = { title: "Explore · Backspin" };

export default async function SpotifyPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const { spotify } = await searchParams;
  return (
    <AppShell active="spotify" spotifyResult={spotify}>
      <SpotifyPicks />
    </AppShell>
  );
}
