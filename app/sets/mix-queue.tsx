import { useQueueDrag } from "./use-queue-drag";
import {
  DotsSixVerticalIcon,
  PlayIcon,
  VinylRecordIcon,
  PushPinIcon,
  ArrowsClockwiseIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Entry, originalYear } from "../../lib/collection";
import { Cover } from "../collection/record-card";
import styles from "./mix-queue.module.css";
export function MixQueue({
  entries,
  currentId,
  onListen,
  pinned,
  canSwap,

  masters,
  onOpen,
  onPin,
  onSwap,
  onReorder,
  onRemove,
}: {
  entries: Entry[];
  currentId: number | null;
  onListen: (id: number) => void;
  pinned: number[];
  canSwap: boolean;

  masters: Record<number, number | null>;
  onOpen: (group: Entry[], trigger: HTMLElement) => void;
  onPin: (id: number) => void;
  onSwap: (id: number) => void;
  onReorder: (ids: number[]) => void;
  onRemove: (id: number) => void;
}) {
  const drag = useQueueDrag(
    entries.map((entry) => entry.instance_id),
    onReorder,
  );
  return (
    <>
      <span id={drag.instructions} className={styles.srOnly}>
        Drag to reorder. With a keyboard, press Space to pick up, arrow keys to
        move, Space to drop, or Escape to cancel.
      </span>
      <span className={styles.srOnly} aria-live="polite">
        {drag.announcement}
      </span>
      <ol ref={drag.list} className={styles.queue} {...drag.listEvents}>
        {drag.order.map((recordId, index) => {
          const entry = entries.find(
            (entry) => entry.instance_id === recordId,
          )!;
          const id = entry.instance_id,
            title = entry.basic_information.title,
            isPinned = pinned.includes(id),
            year = originalYear(entry, masters).year;
          return (
            <li
              key={id}
              data-record-id={id}
              data-pinned={isPinned}
              data-playing={currentId === id}
              data-dragging={drag.activeId === id}
            >
              <div className={styles.row}>
                <button
                  className={styles.record}
                  onClick={(event) => onOpen([entry], event.currentTarget)}
                  aria-label={"View set record " + title}
                >
                  <Cover entry={entry} />
                  <span>
                    <strong>{title}</strong>
                    <small>
                      {entry.basic_information.artists
                        .map((artist) => artist.name)
                        .join(", ") || "Artist unknown"}
                    </small>
                    {year && <small>{year}</small>}
                  </span>
                </button>
                <div className={styles.genres}>
                  {(entry.basic_information.genres || []).map((genre) => (
                    <span key={genre}>{genre}</span>
                  ))}
                </div>
                <div className={styles.actions} aria-label={"Edit " + title}>
                  <span
                    className={styles.position}
                    aria-label={"Position " + (index + 1)}
                  >
                    {index + 1}
                  </span>
                  <button
                    className={styles.dragHandle}
                    aria-label={"Reorder " + title}
                    aria-describedby={drag.instructions}
                    aria-pressed={drag.activeId === id}
                    title="Drag to reorder"
                    disabled={entries.length < 2}
                    {...drag.handle(id)}
                  >
                    <DotsSixVerticalIcon size={22} aria-hidden="true" />
                  </button>

                  <button
                    aria-label={"Set now playing " + title}
                    aria-pressed={currentId === id}
                    title={currentId === id ? "Now playing" : "Set now playing"}
                    onClick={() => onListen(id)}
                  >
                    {currentId === id ? (
                      <VinylRecordIcon
                        size={18}
                        weight="duotone"
                        aria-hidden="true"
                      />
                    ) : (
                      <PlayIcon size={17} weight="fill" aria-hidden="true" />
                    )}
                  </button>
                  <button
                    aria-label={(isPinned ? "Unpin " : "Pin ") + title}
                    aria-pressed={isPinned}
                    title={
                      isPinned
                        ? "Unpin record"
                        : "Keep this record when reshuffling"
                    }
                    onClick={() => onPin(id)}
                  >
                    <PushPinIcon
                      size={17}
                      weight={isPinned ? "fill" : "regular"}
                      aria-hidden="true"
                    />
                  </button>
                  <button
                    aria-label={"Swap " + title}
                    disabled={isPinned || !canSwap}
                    title={
                      isPinned
                        ? "Unpin to swap"
                        : canSwap
                          ? "Swap for another album"
                          : "No other albums available"
                    }
                    onClick={() => onSwap(id)}
                  >
                    <ArrowsClockwiseIcon size={17} aria-hidden="true" />
                  </button>
                  <button
                    aria-label={"Remove " + title}
                    title="Remove from this mix"
                    onClick={() => onRemove(id)}
                  >
                    <XIcon size={17} aria-hidden="true" />
                  </button>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </>
  );
}
