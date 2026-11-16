import { AppShell } from "./components/app-shell";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AppShell active="collection" error={error}>
      <h2>Collection connection</h2>
      <p>
        Your Discogs account is connected. Inspect the authenticated collection
        and release endpoints below.
      </p>
      <ul>
        <li>
          <a href="/api/discogs?kind=identity">Account identity</a>
        </li>
        <li>
          <a href="/api/discogs?kind=collection&page=1">
            First collection page
          </a>
        </li>
        <li>
          <a href="/api/discogs?kind=folders">Collection folders</a>
        </li>
      </ul>
    </AppShell>
  );
}
