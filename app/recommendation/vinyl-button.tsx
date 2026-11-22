import { BrandMark } from "../components/brand-mark";
import styles from "./vinyl-button.module.css";

export function VinylButton({
  loading,
  motion,
  onMotionComplete,
  disabled,
  onPick,
}: {
  loading: boolean;
  motion: "idle" | "spinning" | "rolling";
  onMotionComplete: () => void;
  disabled: boolean;
  onPick: () => void;
}) {
  return (
    <button
      className={styles.button}
      data-loading={loading}
      data-motion={motion}
      data-testid="vinyl-button"
      disabled={loading || motion !== "idle" || disabled}
      aria-busy={loading || motion !== "idle" || undefined}
      aria-label={loading ? "Getting your records ready" : "Drop the needle"}
      onClick={onPick}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget && motion === "rolling")
          onMotionComplete();
      }}
    >
      <span
        className={styles.disc}
        data-testid="vinyl-disc"
        aria-hidden="true"
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && motion === "spinning")
            onMotionComplete();
        }}
      >
        <span className={styles.label}>
          {loading ? (
            <BrandMark size={72} />
          ) : (
            <span className={styles.labelText}>Drop the needle</span>
          )}
        </span>
      </span>
      {(loading || motion !== "idle") && (
        <span className={styles.loadingMessage} role="status">
          {loading
            ? "Getting your records ready…"
            : "You’re gonna like this one"}
        </span>
      )}
    </button>
  );
}
