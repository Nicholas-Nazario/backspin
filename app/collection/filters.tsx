import {
  SlidersHorizontalIcon,
  CaretDownIcon,
  XIcon,
} from "@phosphor-icons/react";
import { Entry, Filters, originalYear } from "../../lib/collection";
import { Toggle } from "../components/toggle";
import styles from "./collection.module.css";
import interaction from "../components/interaction.module.css";
import { YearStatus } from "./year-status";
import type { useMasterYears } from "./use-master-years";
import type { Dispatch, SetStateAction } from "react";
export const initialFilters: Filters = {
  query: "",
  genre: "",
  genres: [],
  style: "",
  artist: "",
  format: "",
  era: "",
  folder: "",
  sort: "artist",
  group: false,
};
export function CollectionFilters({
  entries,
  years,
  lookup,
  folders,
  filters,
  setFilters,
  loading,
  showDisplayOptions = true,
  addGenre,
}: {
  entries: Entry[];
  years: Record<number, number>;
  lookup: ReturnType<typeof useMasterYears>;
  folders: { id: number; name: string }[];
  filters: Filters;
  setFilters: Dispatch<SetStateAction<Filters>>;
  loading: boolean;
  showDisplayOptions?: boolean;
  addGenre: (genre: string) => void;
}) {
  const masters = lookup.masters;
  const initial = initialFilters;
  const values = (field: "genres" | "styles") =>
    [
      ...new Set(entries.flatMap((e) => e.basic_information[field] || [])),
    ].sort();
  const artists = [
    ...new Set(
      entries.flatMap((e) => e.basic_information.artists.map((a) => a.name)),
    ),
  ].sort();
  const formats = [
    ...new Set(
      entries.flatMap((e) =>
        (e.basic_information.formats || []).map((a) => a.name),
      ),
    ),
  ].sort();
  const eras = [
    ...new Set(
      entries
        .map((e) => originalYear(e, years, masters).year)
        .filter((y): y is number => y !== null)
        .map((y) => Math.floor(y / 10) * 10),
    ),
  ].sort();
  const known = entries.filter(
    (e) => originalYear(e, years, masters).year !== null,
  ).length;
  function select(
    field: keyof Filters,
    label: string,
    options: { value: string; label: string }[],
  ) {
    return (
      <label>
        {label}
        <select
          value={String(filters[field])}
          onChange={(e) =>
            setFilters((f) => ({ ...f, [field]: e.target.value }))
          }
        >
          <option value="">All {label.toLowerCase()}</option>
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>
    );
  }
  const opts = (v: string[]) => v.map((v) => ({ value: v, label: v }));
  return (
    <>
      <details className={styles["filter-panel"]} data-testid="filter-panel">
        <summary className={interaction.quiet}>
          <span className={styles["filter-icon"]} aria-hidden="true">
            <SlidersHorizontalIcon size={20} aria-hidden="true" />
          </span>{" "}
          {showDisplayOptions ? "Filters & sorting" : "Narrow the crate"}{" "}
          <span className={styles["filter-count"]}>
            {(filters.genres?.length || 0) +
              [
                filters.style,
                filters.artist,
                filters.format,
                filters.era,
                filters.folder,
              ].filter(Boolean).length || ""}
          </span>
          <span className={styles["filter-chevron"]} aria-hidden="true">
            <CaretDownIcon size={16} aria-hidden="true" />
          </span>
        </summary>
        <div className={styles["toolbar"]} data-testid="filter-controls">
          <label>
            Genre
            <select value="" onChange={(e) => addGenre(e.target.value)}>
              <option value="">Choose genres…</option>
              {values("genres").map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
          {select("style", "Style", opts(values("styles")))}
          {select("artist", "Artist", opts(artists))}
          {select("format", "Format", opts(formats))}
          {select("era", "Era", [
            ...eras.map((y) => ({ value: String(y), label: y + "s" })),
            { value: "unknown", label: "Original year unknown" },
          ])}
          {folders.length > 1 &&
            select(
              "folder",
              "Folder",
              folders
                .filter((f) => f.id !== 0)
                .map((f) => ({ value: String(f.id), label: f.name })),
            )}
          {showDisplayOptions && (
            <label>
              Sort by
              <select
                value={filters.sort}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, sort: e.target.value }))
                }
              >
                <option value="title">Album title</option>
                <option value="artist">Artist</option>
                <option value="year">Original year</option>
                <option value="added">Recently added</option>
              </select>
            </label>
          )}
        </div>
        <div className={styles["browse-options"]}>
          {showDisplayOptions && (
            <Toggle
              label="Group editions"
              checked={filters.group}
              onChange={(checked) =>
                setFilters((current) => ({ ...current, group: checked }))
              }
            />
          )}

          <button
            className={styles["text-button"]}
            onClick={() => setFilters(initial)}
          >
            Clear filters
          </button>
          <YearStatus
            lookup={lookup}
            known={known}
            count={entries.length}
            loading={loading}
          />
        </div>
        <p className={styles["small"]}>
          {known} of {entries.length} original years known. Find original
          release years looks up the Discogs master for each album to enable era
          filters. It never uses your pressing’s date. Albums without a known
          original year stay unknown; you can correct them in record details.
          This may take a few minutes.
        </p>
      </details>
      <div
        className={styles["applied-filters"]}
        aria-label="Applied genre filters"
      >
        {(filters.genres || []).map((g) => (
          <button
            key={g}
            className={interaction.filled}
            onClick={() =>
              setFilters((f) => ({
                ...f,
                genres: f.genres?.filter((v) => v !== g),
              }))
            }
            aria-label={"Remove genre " + g}
          >
            {g} <XIcon size={12} weight="bold" aria-hidden="true" />
          </button>
        ))}
        {!!filters.genres?.length && <small>Matching any selected genre</small>}
      </div>
    </>
  );
}
