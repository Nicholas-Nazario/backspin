import { session } from "../lib/session";
import { blockedAlbumKeys } from "../lib/blocked-albums";
import { database } from "../lib/db";
import { randomInt } from "node:crypto";
import { taglines } from "./recommendation/taglines";
import { AppShell } from "./components/app-shell";
import Recommendation from "./recommendation/recommendation";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; spotify?: string }>;
}) {
  const { error, spotify } = await searchParams;
  const tagline = taglines[randomInt(taglines.length)];
  const account = await session();
  const blockedKeys = account
    ? blockedAlbumKeys(database(), account.userId)
    : [];
  return (
    <AppShell
      active="discover"
      error={error}
      tagline={tagline}
      spotifyResult={spotify}
    >
      <Recommendation tagline={tagline} blockedKeys={blockedKeys} />
    </AppShell>
  );
}
