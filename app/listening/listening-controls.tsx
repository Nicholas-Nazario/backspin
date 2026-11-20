import { VinylRecordIcon, ArmchairIcon } from "@phosphor-icons/react";
import { ListeningActions } from "./listening-actions";
import type { useListening } from "./use-listening";
import { Cover } from "../collection/record-card";
import styles from "./listening-controls.module.css";
export function ListeningControls({
  listening,
  onEnterRoom,
}: {
  listening: ReturnType<typeof useListening>;
  onEnterRoom: () => void;
}) {
  if (listening.currentId === null) return null;
  const { current } = listening;
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
      <button onClick={onEnterRoom} disabled={!current}>
        <ArmchairIcon size={20} aria-hidden="true" /> Listening room
      </button>
      <ListeningActions listening={listening} />
      <span className={styles.announcement} aria-live="polite">
        {current ? "Now playing " + current.basic_information.title : ""}
      </span>
    </section>
  );
}
