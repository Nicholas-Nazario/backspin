import { SkipBackIcon, SkipForwardIcon, StopIcon } from "@phosphor-icons/react";
import type { useListening } from "./use-listening";
import styles from "./listening-controls.module.css";

export function ListeningActions({
  listening,
  onStop = listening.stop,
  disabled = false,
}: {
  listening: ReturnType<typeof useListening>;
  onStop?: () => void;
  disabled?: boolean;
}) {
  const { previous, next } = listening;
  return (
    <div className={styles.actions}>
      <button
        disabled={disabled || !previous}
        aria-label="Previous album"
        title="Previous album"
        onClick={() => previous && listening.start(previous.instance_id)}
      >
        <SkipBackIcon size={22} weight="fill" aria-hidden="true" />
      </button>
      <button
        aria-label="Stop listening"
        title="Clear now playing"
        onClick={onStop}
      >
        <StopIcon size={19} weight="fill" aria-hidden="true" />
      </button>
      <button
        disabled={disabled || !next}
        aria-label="Next album"
        title="Next album"
        onClick={() => next && listening.start(next.instance_id)}
      >
        <SkipForwardIcon size={22} weight="fill" aria-hidden="true" />
      </button>
    </div>
  );
}
