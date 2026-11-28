import { useState } from "react";
import { VinylRecordIcon } from "@phosphor-icons/react";
import { BlockAlbumButton } from "./block-album-button";
import { Entry, workKey } from "../../lib/collection";
import styles from "./collection.module.css";
export function Cover({
  entry,
  fullArtwork = false,
}: {
  entry: Entry;
  fullArtwork?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  const b = entry.basic_information;
  return (
    <div className={`${styles.art} ${fullArtwork ? styles.fullArtwork : ""}`}>
      {!failed && (b.cover_image || b.thumb) ? (
        <img
          src={b.cover_image || b.thumb}
          alt={"Cover of " + b.title}
          loading={fullArtwork ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles["cover-fallback"]}>
          <VinylRecordIcon size={64} weight="duotone" aria-hidden="true" />
          <small>No artwork available</small>
        </span>
      )}
    </div>
  );
}
export function RecordCard({
  group,
  blocked,
  year,
  onOpen,
  onGenre,
}: {
  group: Entry[];
  blocked: boolean;
  year: number | null;
  onOpen: (group: Entry[], trigger: HTMLElement) => void;
  onGenre: (genre: string) => void;
}) {
  const e = group[0],
    b = e.basic_information;
  return (
    <article>
      <div className={styles.cardArtwork}>
        <button
          className={styles["cover-button"]}
          onClick={(ev) => onOpen(group, ev.currentTarget)}
          aria-label={"View " + b.title}
        >
          <Cover entry={e} />
        </button>
        <BlockAlbumButton
          albumKey={workKey(e)}
          title={b.title}
          blocked={blocked}
        />
      </div>
      <h3>
        <button
          className={styles["text-button"]}
          onClick={(ev) => onOpen(group, ev.currentTarget)}
        >
          {b.title}
        </button>
      </h3>
      <p className={styles["artist"]}>
        {b.artists.map((a) => a.name).join(", ")}
      </p>
      <div className={styles["chips"]}>
        {year && <span>{year}</span>}
        {(b.genres || []).slice(0, 2).map((g) => (
          <span key={g}>
            <button
              className={styles["genre-tag"]}
              aria-label={"Filter by genre " + g}
              onClick={() => onGenre(g)}
            >
              {g}
            </button>
          </span>
        ))}
        {group.length > 1 && <span>{group.length} owned copies</span>}
      </div>
    </article>
  );
}
