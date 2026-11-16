import { AppShell } from "./components/app-shell";
import Collection from "./collection";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  return (
    <AppShell active="sets" error={error}>
      <Collection mode="sets" />
    </AppShell>
  );
}
