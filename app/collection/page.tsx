import { AppShell } from "../components/app-shell";
import Collection from "../collection";
export const dynamic = "force-dynamic";
export default function CollectionPage() {
  return (
    <AppShell active="collection">
      <Collection />
    </AppShell>
  );
}
