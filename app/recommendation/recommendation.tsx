"use client";
import { useRef, useState } from "react";
import {
  SlidersHorizontalIcon,
  VinylRecordIcon,
  XIcon,
} from "@phosphor-icons/react";
import { originalYear, workKey } from "../../lib/collection";
import {
  emptyRecommendationFilters,
  recommendationPool,
  recommendationReason,
} from "../../lib/recommendation";
import { useCollection } from "../collection/use-collection";
import { useMasterYears } from "../collection/use-master-years";
import { Cover } from "../collection/record-card";
import { ShuffleDeck } from "../components/shuffle-deck";
import { NarrowSheet } from "./narrow-sheet";
import { VinylButton } from "./vinyl-button";
import { useRecommendation } from "./use-recommendation";
import styles from "./recommendation.module.css";
import interaction from "../components/interaction.module.css";

export default function Recommendation({
  tagline,
  blockedKeys,
}: {
  tagline: string;
  blockedKeys: string[];
}) {
  const collection = useCollection();
  const lookup = useMasterYears(collection.entries, collection.loading);
  const [filters, setFilters] = useState(emptyRecommendationFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const years = { masters: lookup.masters };
  const blocked = new Set(blockedKeys);
  const eligible = collection.entries.filter(
    (entry) => !blocked.has(workKey(entry)),
  );
  const pool = recommendationPool(eligible, filters, years);
  const initialLoading = collection.loading && !collection.refreshing;
  const enabled = !collection.loading && !collection.error;
  const { entry, phase, pick, completeMotion } = useRecommendation(
    pool,
    filters,
    enabled,
  );
  const genres = [
    ...new Set(
      collection.entries.flatMap(
        (record) => record.basic_information.genres || [],
      ),
    ),
  ].sort();
  const knownYears = collection.entries
    .map((record) => originalYear(record, lookup.masters).year)
    .filter((year): year is number => year !== null);
  const eras = [
    ...new Set(knownYears.map((year) => Math.floor(year / 10) * 10)),
  ].sort((a, b) => a - b);
  const albumCount = new Set(pool.map(workKey)).size;
  const hasFilters = Object.values(filters).some(Boolean);
  const shuffling = phase === "shuffling";
  const result = entry && (phase === "ready" || shuffling);
  const year = entry && originalYear(entry, lookup.masters).year;
  const reason = entry ? recommendationReason(entry, filters) : "";
  return (
    <section
      className={styles.experience}
      data-refreshing={collection.refreshing}
      aria-label="Find your next record"
    >
      {!result && (
        <div className={styles.intro}>
          <h2>{tagline}</h2>
        </div>
      )}
      {result && (
        <article
          key={entry.instance_id}
          className={styles.result}
          aria-label="Your album recommendation"
        >
          <div className={styles.cover} data-testid="recommendation-artwork">
            <div
              className={styles.artwork}
              data-hidden={shuffling}
              aria-hidden={shuffling || undefined}
            >
              <Cover key={entry.instance_id} entry={entry} fullArtwork />
            </div>
            {shuffling && (
              <div className={styles.shuffleArtwork} role="status">
                <ShuffleDeck size="artwork" />
                <span className={styles.shuffleMessage}>
                  You’re gonna like this one
                </span>
              </div>
            )}
          </div>
          <div
            className={styles.identity}
            data-loading={shuffling}
            data-testid="recommendation-identity"
            aria-hidden={shuffling || undefined}
            aria-live="polite"
            aria-atomic="true"
          >
            <p>
              {entry.basic_information.artists
                .map((artist) => artist.name)
                .join(", ")}
            </p>
            <h3>{entry.basic_information.title}</h3>
            <p className={styles.metadata}>
              {[year, ...(entry.basic_information.genres || []).slice(0, 2)]
                .filter(Boolean)
                .join(" · ")}
            </p>
            {reason && <p className={styles.reason}>{reason}</p>}
          </div>
        </article>
      )}
      {collection.error && (
        <div className={styles.notice} role="alert">
          <p>We couldn’t open your collection. {collection.error}</p>
          <button className={interaction.filled} onClick={collection.refresh}>
            Try loading again
          </button>
        </div>
      )}
      {enabled && !collection.entries.length && (
        <p role="status">
          Your crates are empty. Add records on Discogs, then{" "}
          <button className={styles.quiet} onClick={collection.refresh}>
            refresh your collection
          </button>
          .
        </p>
      )}
      {enabled && collection.entries.length > 0 && !eligible.length && (
        <p role="status">
          All your albums are blocked. Use the recommendation button on an album
          in Collection to allow it again.
        </p>
      )}
      {enabled && eligible.length > 0 && !pool.length && (
        <div className={styles.notice} role="status">
          <p>
            No records match those limits. Try another genre or era, or open up
            your whole collection.
          </p>
          <button
            className={interaction.filled}
            onClick={() => setFilters(emptyRecommendationFilters)}
          >
            Clear filters
          </button>
        </div>
      )}
      <div className={styles.actions}>
        <div className={styles.chips} aria-label="Selected filters">
          {(Object.keys(filters) as (keyof typeof filters)[])
            .filter((key) => filters[key])
            .map((key) => (
              <button
                className={interaction.filled}
                key={key}
                aria-label={`Remove ${key} filter`}
                onClick={() => setFilters({ ...filters, [key]: "" })}
              >
                {key === "era" ? `${filters[key]}s` : filters[key]}
                <XIcon size={14} aria-hidden="true" />
              </button>
            ))}
          {hasFilters && (
            <button
              className={styles.quiet}
              onClick={() => setFilters(emptyRecommendationFilters)}
            >
              Clear
            </button>
          )}
        </div>
        <div className={!result ? styles.stage : undefined}>
          {result ? (
            <button
              className={styles.again}
              disabled={!enabled || !pool.length || shuffling}
              onClick={pick}
            >
              <VinylRecordIcon size={22} aria-hidden="true" /> Try another
            </button>
          ) : (
            <VinylButton
              loading={initialLoading}
              motion={
                phase === "spinning" || phase === "rolling" ? phase : "idle"
              }
              onMotionComplete={completeMotion}
              disabled={!enabled || !pool.length}
              onPick={pick}
            />
          )}
        </div>
        {result && albumCount === 1 && (
          <p className={styles.hint}>
            This is the only album in this lane. Widen your filters for a
            different pick.
          </p>
        )}
        <button
          ref={filterTrigger}
          className={styles.quiet}
          aria-haspopup="dialog"
          onClick={() => setSheetOpen(true)}
        >
          <SlidersHorizontalIcon size={19} aria-hidden="true" /> Narrow it down
        </button>
      </div>
      {sheetOpen && (
        <NarrowSheet
          filters={filters}
          onChange={setFilters}
          onClose={() => {
            setSheetOpen(false);
            filterTrigger.current?.focus();
          }}
          genres={genres}
          eras={eras}
          lookup={lookup}
          known={knownYears.length}
          count={collection.entries.length}
          loading={collection.loading}
        />
      )}
    </section>
  );
}
