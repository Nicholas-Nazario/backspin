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
import { useRecommendation } from "./use-recommendation";
import styles from "./recommendation.module.css";

export default function Recommendation({ tagline }: { tagline: string }) {
  const collection = useCollection();
  const lookup = useMasterYears(collection.entries, collection.loading);
  const [filters, setFilters] = useState(emptyRecommendationFilters);
  const [sheetOpen, setSheetOpen] = useState(false);
  const filterTrigger = useRef<HTMLButtonElement>(null);
  const years = { corrections: collection.years, masters: lookup.masters };
  const pool = recommendationPool(collection.entries, filters, years);
  const enabled = !collection.loading && !collection.error;
  const { entry, phase, pick } = useRecommendation(pool, filters, enabled);
  const genres = [
    ...new Set(
      collection.entries.flatMap(
        (record) => record.basic_information.genres || [],
      ),
    ),
  ].sort();
  const knownYears = collection.entries
    .map(
      (record) => originalYear(record, collection.years, lookup.masters).year,
    )
    .filter((year): year is number => year !== null);
  const eras = [
    ...new Set(knownYears.map((year) => Math.floor(year / 10) * 10)),
  ].sort((a, b) => a - b);
  const albumCount = new Set(pool.map(workKey)).size;
  const hasFilters = Object.values(filters).some(Boolean);
  const result = entry && phase === "ready";
  const year =
    entry && originalYear(entry, collection.years, lookup.masters).year;
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
      {collection.loading && !collection.refreshing && (
        <p role="status">Opening your crates…</p>
      )}
      {result && (
        <article
          key={entry.instance_id}
          className={styles.result}
          aria-label="Your album recommendation"
        >
          <div className={styles.cover}>
            <Cover key={entry.instance_id} entry={entry} fullArtwork />
          </div>
          <div
            className={styles.identity}
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
          <button onClick={collection.refresh}>Try loading again</button>
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
      {enabled && collection.entries.length > 0 && !pool.length && (
        <div className={styles.notice} role="status">
          <p>
            No records match those limits. Try another genre or era, or open up
            your whole collection.
          </p>
          <button onClick={() => setFilters(emptyRecommendationFilters)}>
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
          {phase === "revealing" ? (
            <div className={styles.suspense} role="status">
              <ShuffleDeck />
              <span>You’re gonna like this one</span>
            </div>
          ) : (
            <button
              className={result ? styles.again : styles.vinyl}
              disabled={!enabled || !pool.length}
              onClick={pick}
            >
              {result ? (
                <>
                  <VinylRecordIcon size={22} aria-hidden="true" /> Try another
                </>
              ) : (
                <>
                  <span className={styles.recordDisc}>
                    <span className={styles.recordLabel}>Drop the needle</span>
                  </span>
                  <svg
                    className={styles.tonearm}
                    viewBox="0 0 320 320"
                    aria-hidden="true"
                  >
                    <g className={styles.arm}>
                      <path
                        className={styles.armOutline}
                        d="M295 40 L295 156 Q295 167 289 176 L284 226"
                      />
                      <path
                        className={styles.armHighlight}
                        d="M295 40 L295 156 Q295 167 289 176 L284 226"
                      />
                      <path className={styles.stylus} d="M273 242 L271 245" />
                      <rect
                        className={styles.cartridge}
                        x="274"
                        y="225"
                        width="10"
                        height="18"
                        rx="3"
                        transform="rotate(38 279 234)"
                      />
                    </g>
                    <circle className={styles.pivot} cx="295" cy="40" r="9" />
                    <circle
                      className={styles.pivotCenter}
                      cx="295"
                      cy="40"
                      r="3"
                    />
                  </svg>
                </>
              )}
            </button>
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
