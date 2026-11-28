import { session } from "../../lib/session";
import { blockedAlbumKeys } from "../../lib/blocked-albums";
import { database } from "../../lib/db";
import { AppShell } from "../components/app-shell";
import Collection from "../collection";
export const dynamic = "force-dynamic";
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const { spotify } = await searchParams;
  const account = await session();
  const blockedKeys = account
    ? blockedAlbumKeys(database(), account.userId)
    : [];
  return (
    <AppShell active="collection" spotifyResult={spotify}>
      <Collection blockedKeys={blockedKeys} />
    </AppShell>
  );
}
