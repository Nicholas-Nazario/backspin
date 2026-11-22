import { AppShell } from "../components/app-shell";
import Collection from "../collection";
export const dynamic = "force-dynamic";
export default async function CollectionPage({
  searchParams,
}: {
  searchParams: Promise<{ spotify?: string }>;
}) {
  const { spotify } = await searchParams;
  return (
    <AppShell active="collection" spotifyResult={spotify}>
      <Collection />
    </AppShell>
  );
}
