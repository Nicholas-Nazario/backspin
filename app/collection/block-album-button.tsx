import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProhibitIcon } from "@phosphor-icons/react";
import styles from "./collection.module.css";

export function BlockAlbumButton({
  albumKey,
  title,
  blocked,
}: {
  albumKey: string;
  title: string;
  blocked: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function toggle() {
    setError("");
    startTransition(async () => {
      try {
        const response = await fetch("/api/blocked-albums", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ key: albumKey, blocked: !blocked }),
        });
        if (!response.ok) throw new Error();
        startTransition(() => router.refresh());
      } catch {
        setError("Couldn’t save your recommendation preference. Try again.");
      }
    });
  }

  return (
    <div>
      <button
        className={styles.recommendationToggle}
        aria-label={`Block recommendations for ${title}`}
        title={blocked ? "Recommendations blocked" : "Recommendations allowed"}
        aria-pressed={blocked}
        aria-busy={pending}
        disabled={pending}
        onClick={toggle}
      >
        <span className={styles.recommendationBadge}>
          <ProhibitIcon size={16} weight="bold" aria-hidden="true" />
        </span>
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
