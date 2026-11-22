import { useEffect, useRef } from "react";
import { XIcon } from "@phosphor-icons/react";
import {
  moodHints,
  type RecommendationFilters,
} from "../../lib/recommendation";
import { YearStatus } from "../collection/year-status";
import type { useMasterYears } from "../collection/use-master-years";
import styles from "./recommendation.module.css";
import interaction from "../components/interaction.module.css";

export function NarrowSheet({
  filters,
  onChange,
  onClose,
  genres,
  eras,
  lookup,
  known,
  count,
  loading,
}: {
  filters: RecommendationFilters;
  onChange: (filters: RecommendationFilters) => void;
  onClose: () => void;
  genres: string[];
  eras: number[];
  lookup: ReturnType<typeof useMasterYears>;
  known: number;
  count: number;
  loading: boolean;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.sheet}
      aria-labelledby="narrow-title"
      onCancel={(event) => {
        event.preventDefault();
        dialog.current?.close();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          const bounds = event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            dialog.current?.close();
        }
      }}
    >
      <div className={styles.sheetHeading}>
        <h2 id="narrow-title">Narrow it down</h2>
        <button
          autoFocus
          className={styles.quiet}
          aria-label="Close filters"
          onClick={() => dialog.current?.close()}
        >
          <XIcon size={24} />
        </button>
      </div>
      <p>A little direction. We’ll take it from here.</p>
      <label className={styles.field}>
        <span>
          Genre <small>Only these records</small>
        </span>
        <select
          value={filters.genre}
          onChange={(event) =>
            onChange({ ...filters, genre: event.target.value })
          }
        >
          <option value="">Any genre</option>
          {genres.map((genre) => (
            <option key={genre}>{genre}</option>
          ))}
        </select>
      </label>
      <fieldset className={styles.moods}>
        <legend>
          Mood <small>A nudge, not a rule</small>
        </legend>
        <div>
          <button
            className={interaction.quiet}
            aria-pressed={!filters.mood}
            onClick={() => onChange({ ...filters, mood: "" })}
          >
            Surprise me
          </button>
          {(Object.keys(moodHints) as (keyof typeof moodHints)[]).map(
            (mood) => (
              <button
                className={interaction.quiet}
                key={mood}
                aria-pressed={filters.mood === mood}
                onClick={() => onChange({ ...filters, mood })}
              >
                {mood}
              </button>
            ),
          )}
        </div>
        <p>
          Guided by genre and style tags. Every record in your chosen pool still
          has a chance.
        </p>
      </fieldset>
      <label className={styles.field}>
        <span>
          Era <small>Original release decade</small>
        </span>
        <select
          value={filters.era}
          disabled={!eras.length && !filters.era}
          onChange={(event) =>
            onChange({ ...filters, era: event.target.value })
          }
        >
          <option value="">Any era</option>
          {filters.era && !eras.includes(Number(filters.era)) && (
            <option value={filters.era}>
              {filters.era}s (years need syncing)
            </option>
          )}
          {eras.map((era) => (
            <option key={era} value={era}>
              {era}s
            </option>
          ))}
        </select>
      </label>
      <p className={styles.hint}>
        Era includes records with a synced original year or a year you’ve
        corrected. Unknown years stay out of an era-specific pick.
      </p>
      <YearStatus
        lookup={lookup}
        known={known}
        count={count}
        loading={loading}
      />
      <button
        className={styles.primary}
        onClick={() => dialog.current?.close()}
      >
        That’s my lane
      </button>
    </dialog>
  );
}
