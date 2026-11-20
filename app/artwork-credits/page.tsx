import Link from "next/link";
import { ArtworkCredits } from "../listening/artwork-credits";

export default function ArtworkCreditsPage() {
  return (
    <main>
      <Link href="/">Back to Backspin</Link>
      <ArtworkCredits />
    </main>
  );
}
