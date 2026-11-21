import { randomInt } from "node:crypto";
import { taglines } from "./recommendation/taglines";
import { AppShell } from "./components/app-shell";
import Recommendation from "./recommendation/recommendation";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const tagline = taglines[randomInt(taglines.length)];
  return (
    <AppShell active="discover" error={error} tagline={tagline}>
      <Recommendation tagline={tagline} />
    </AppShell>
  );
}
