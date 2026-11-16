import {
  SkipBackIcon,
  SkipForwardIcon,
  StopIcon,
  VinylRecordIcon,
} from "@phosphor-icons/react";
import type { useListening } from "./use-listening";
import { Cover } from "../collection/record-card";
import styles from "./listening-controls.module.css";
export function ListeningControls({
  listening,
}: {
  listening: ReturnType<typeof useListening>;
}) {
  if (listening.currentId === null) return null;
  const { current, previous, next } = listening;
  return (
    <section className={styles.player} aria-label="Now playing">
      {current ? (
        <>
          <div className={styles.cover}>
            <Cover key={current.instance_id} entry={current} />
          </div>
          <div className={styles.metadata}>
            <span className={styles.label}>
              <VinylRecordIcon size={15} weight="duotone" aria-hidden="true" />
              Now playing
            </span>
            <strong>{current.basic_information.title}</strong>
            <span>
              {current.basic_information.artists
                .map((artist) => artist.name)
                .join(", ") || "Artist unknown"}
            </span>
            {!listening.inMix && <small>Outside this mix</small>}
          </div>
        </>
      ) : (
        <p className={styles.metadata}>
          This record is no longer available in your collection.
        </p>
      )}
      <div className={styles.actions}>
        <button
          disabled={!previous}
          aria-label="Previous album"
          title="Previous album"
          onClick={() => previous && listening.start(previous.instance_id)}
        >
          <SkipBackIcon size={22} weight="fill" aria-hidden="true" />
        </button>
        <button
          aria-label="Stop listening"
          title="Clear now playing"
          onClick={listening.stop}
        >
          <StopIcon size={19} weight="fill" aria-hidden="true" />
        </button>
        <button
          disabled={!next}
          aria-label="Next album"
          title="Next album"
          onClick={() => next && listening.start(next.instance_id)}
        >
          <SkipForwardIcon size={22} weight="fill" aria-hidden="true" />
        </button>
      </div>
      <span className={styles.announcement} aria-live="polite">
        {current ? "Now playing " + current.basic_information.title : ""}
      </span>
    </section>
  );
}
