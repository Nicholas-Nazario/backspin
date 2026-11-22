import type { Entry } from "../../lib/collection";
import { originalYear } from "../../lib/collection";
import type { MixTarget, MixMode } from "../../lib/mix-modes";
import type { useMasterYears } from "../collection/use-master-years";
import { YearStatus } from "../collection/year-status";
import styles from "./mix-mode.module.css";
export function MixModePicker({
  entries,

  masters,
  target,
  onChange,
  yearLookup,
  disabled,
}: {
  entries: Entry[];

  masters: Record<number, number | null>;
  target: MixTarget;
  onChange: (target: MixTarget) => void;
  yearLookup: ReturnType<typeof useMasterYears>;
  disabled: boolean;
}) {
  const genres = [
    ...new Set(
      entries.flatMap((entry) => entry.basic_information.genres || []),
    ),
  ].sort();
  const musicalStyles = [
    ...new Set(
      entries.flatMap((entry) => entry.basic_information.styles || []),
    ),
  ].sort();
  const years = entries.map((entry) => originalYear(entry, masters).year);
  const decades = [
    ...new Set(
      years
        .filter((year): year is number => year !== null)
        .map((year) => Math.floor(year / 10) * 10),
    ),
  ].sort((a, b) => a - b);
  const options =
    target.mode === "genre"
      ? genres
      : target.mode === "style"
        ? musicalStyles
        : decades.map(String);
  return (
    <div className={styles.modes}>
      <fieldset disabled={disabled}>
        <legend className={styles.srOnly}>Mix mode</legend>
        {(
          [
            ["random", "Surprise me"],
            ["genre", "Genre"],
            ["style", "Style"],
            ["era", "Era"],
          ] as const
        ).map(([mode, label]) => (
          <label key={mode} className={styles.choice}>
            <input
              type="radio"
              name="mix-mode"
              value={mode}
              checked={target.mode === mode}
              onChange={() => onChange({ mode: mode as MixMode, value: "" })}
            />
            <span>{label}</span>
          </label>
        ))}
      </fieldset>
      {target.mode !== "random" && (
        <div className={styles.selection}>
          <label htmlFor="mix-target">
            {target.mode === "genre"
              ? "Genre"
              : target.mode === "style"
                ? "Style"
                : "Original release era"}
          </label>
          <select
            id="mix-target"
            disabled={disabled || !options.length}
            value={target.value}
            onChange={(event) =>
              onChange({ ...target, value: event.target.value })
            }
          >
            <option value="">
              {options.length
                ? "Choose " +
                  (target.mode === "era" ? "an era" : "a " + target.mode) +
                  "…"
                : target.mode === "era"
                  ? "Find original years first"
                  : "No " + target.mode + " metadata available"}
            </option>
            {options.map((value) => (
              <option key={value} value={value}>
                {target.mode === "era" ? value + "s" : value}
              </option>
            ))}
          </select>
        </div>
      )}
      {target.mode === "era" && (
        <YearStatus
          lookup={yearLookup}
          known={years.filter((year) => year !== null).length}
          count={entries.length}
          loading={disabled}
        />
      )}
    </div>
  );
}
