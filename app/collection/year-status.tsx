import {
  ArrowClockwiseIcon,
  SpinnerGapIcon,
  CheckCircleIcon,
  WarningCircleIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react";
import styles from "./collection.module.css";
import type { useMasterYears } from "./use-master-years";
export function YearStatus({
  lookup,
  known,
  count,
  loading,
}: {
  lookup: ReturnType<typeof useMasterYears>;
  known: number;
  count: number;
  loading: boolean;
}) {
  const {
    resolving,
    status: yearStatus,
    progress: yearProgress,
    total: yearTotal,
    failures: yearFailures,
    run: resolveYears,
  } = lookup;
  return (
    <div
      className={styles["year-resolution"]}
      aria-label="Original release year lookup"
    >
      {resolving ? (
        <div className={styles["year-progress"]}>
          <div className={styles["year-progress-heading"]}>
            <SpinnerGapIcon
              className={styles["loading-spin"]}
              size={20}
              aria-hidden="true"
            />
            <span>Finding original years</span>
            <strong>
              {yearProgress} / {yearTotal}
            </strong>
            <button className={styles["text-button"]} onClick={lookup.stop}>
              Stop
            </button>
          </div>
          <progress
            className={styles["progress-track"]}
            aria-label="Albums checked for original years"
            max={Math.max(1, yearTotal)}
            value={yearProgress}
          />
          <span className={styles["progress-label"]}>
            {yearProgress} of {yearTotal} albums checked
          </span>
          <small aria-live="polite">
            {yearFailures
              ? `${yearFailures} could not be loaded; continuing…`
              : "Checking albums, not individual owned copies…"}
          </small>
        </div>
      ) : yearStatus === "done" ? (
        <div
          className={[styles["year-result"], styles["success"]].join(" ")}
          role="status"
        >
          <CheckCircleIcon size={23} weight="duotone" aria-hidden="true" />
          <div>
            <strong>Original year lookup complete</strong>
            <small>
              {known} of {count} records have a year
              {known < count ? " · remaining dates are unknown" : ""}
            </small>
          </div>
          <button
            className={styles["year-refresh-icon"]}
            aria-label="Refresh years"
            title="Refresh years"
            disabled={loading}
            onClick={() => resolveYears(true)}
          >
            <ArrowClockwiseIcon size={17} aria-hidden="true" />
          </button>
        </div>
      ) : yearStatus === "partial" || yearStatus === "paused" ? (
        <div className={styles["year-result"]} role="status">
          <WarningCircleIcon size={23} weight="duotone" aria-hidden="true" />
          <div>
            <strong>
              {yearStatus === "paused"
                ? "Lookup paused"
                : "Some dates couldn’t be loaded"}
            </strong>
            <small>
              {known} of {count} records have a year
            </small>
          </div>
          <button
            className={styles["text-button"]}
            disabled={loading}
            onClick={() => resolveYears()}
          >
            {yearStatus === "paused" ? "Resume" : "Retry missing"}
          </button>
        </div>
      ) : (
        <button
          className={styles["secondary"]}
          disabled={loading || !count}
          onClick={() => resolveYears()}
        >
          <CalendarBlankIcon size={18} aria-hidden="true" /> Find original
          release years
        </button>
      )}
    </div>
  );
}
