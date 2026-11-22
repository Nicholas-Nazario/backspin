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
  return (
    <AppShell
      active="discover"
      error={error}
      tagline={tagline}
      spotifyResult={spotify}
    >
      <Recommendation tagline={tagline} />
    </AppShell>
  );
}
