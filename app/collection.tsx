"use client";
import { useEffect, useRef, useState } from "react";
import { MagnifyingGlassIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { Entry, explore, originalYear } from "../lib/collection";
import { useSearchPrompt } from "./search-prompts";
import { useCollection } from "./collection/use-collection";
import { useMasterYears } from "./collection/use-master-years";
import { CollectionFilters, initialFilters } from "./collection/filters";
import { RecordCard } from "./collection/record-card";
import { RecordDetails } from "./collection/record-details";
import { RandomSet } from "./sets/random-set";
import styles from "./collection/collection.module.css";
export default function Collection({
  mode = "collection",
}: {
  mode?: "sets" | "collection";
}) {
  const collection = useCollection();
  const { entries, years, loading } = collection;
  const lookup = useMasterYears(entries, loading);
  const [filters, setFilters] = useState(initialFilters),
    [focused, setFocused] = useState(false),
    [limit, setLimit] = useState(60),
    [selected, setSelected] = useState<Entry[] | null>(null);
  const trigger = useRef<HTMLElement | null>(null);
  const prompt = useSearchPrompt(entries, focused || !!filters.query);
  const groups = explore(entries, filters, years, lookup.masters);
  useEffect(() => {
    setLimit(60);
  }, [filters]);
  useEffect(() => {
    setSelected(null);
  }, [collection.revision]);
  function addGenre(genre: string) {
    if (genre)
      setFilters((f) => ({
        ...f,
        genres: [...new Set([...(f.genres || []), genre])],
      }));
  }
  function close() {
    setSelected(null);
    trigger.current?.focus();
  }
  return (
    <section className={styles["explorer"]}>
      <div className={styles["section-title"]}>
        <h2>
          {mode === "sets" ? "Make a set" : "Collection"}{" "}
          {mode === "collection" && (
            <span className={styles["record-count"]}>
              {loading && !collection.refreshing
                ? entries.length + " / " + collection.total
                : entries.length}{" "}
              records
              {collection.lastUpdated && (
                <span className={styles.lastUpdated}>
                  {" · Last updated "}
                  <time
                    dateTime={new Date(collection.lastUpdated).toISOString()}
                  >
                    {new Date(collection.lastUpdated).toLocaleTimeString([], {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </time>
                </span>
              )}
            </span>
          )}
        </h2>
        <button className={styles["secondary"]} onClick={collection.refresh}>
          <ArrowClockwiseIcon size={16} aria-hidden="true" />
          Refresh collection
        </button>
      </div>
      {loading && !collection.refreshing && (
        <p role="status">
          Opening your crates… Filters currently cover the records loaded so
          far.
        </p>
      )}
      {collection.error && (
        <p role="alert" className={styles["notice"]}>
          {collection.error}
          <button onClick={collection.refresh}>Retry import</button>
        </p>
      )}
      {mode === "collection" && (
        <>
          {" "}
          <div className={styles["search-row"]}>
            <label className={styles["search"]}>
              Find a record
              <MagnifyingGlassIcon
                className={styles["search-icon"]}
                size={22}
                aria-hidden="true"
              />
              <input
                type="search"
                placeholder={prompt}
                value={filters.query}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                onChange={(e) =>
                  setFilters((f) => ({ ...f, query: e.target.value }))
                }
              />
            </label>
          </div>
          <CollectionFilters
            showDisplayOptions={mode === "collection"}
            entries={entries}
            years={years}
            lookup={lookup}
            folders={collection.folders}
            filters={filters}
            setFilters={setFilters}
            loading={loading}
            addGenre={addGenre}
          />
        </>
      )}
      {mode === "sets" && (
        <RandomSet
          standalone
          yearLookup={lookup}
          entries={entries}
          corrections={years}
          masters={lookup.masters}
          disabled={loading || !!collection.error}
          collectionError={collection.error}
          onRefresh={collection.refresh}
          onOpen={(records, element) => {
            trigger.current = element;
            setSelected(records);
          }}
        />
      )}
      <a
        className={styles["collection-attribution"]}
        href="https://www.discogs.com/mycollection"
        target="_blank"
        rel="noopener"
      >
        Data provided by Discogs.
      </a>
      {mode === "collection" && (
        <>
          <p aria-live="polite">
            {groups.length} {filters.group ? "albums" : "records"} match
            {loading ? " so far" : ""}
          </p>
          {!loading && !entries.length && !collection.error && (
            <p className={styles["empty"]}>
              Your collection is empty. Add records on Discogs, then refresh.
            </p>
          )}
          {entries.length > 0 && !groups.length && (
            <p className={styles["empty"]}>
              Nothing in this crate matches. Try clearing a filter.
            </p>
          )}
          <div className={styles["grid"]} data-testid="record-grid">
            {groups.slice(0, limit).map((group) => (
              <RecordCard
                key={
                  filters.group
                    ? "g" +
                      (group[0].basic_information.master_id || group[0].id)
                    : group[0].instance_id
                }
                group={group}
                year={originalYear(group[0], years, lookup.masters).year}
                onGenre={addGenre}
                onOpen={(records, element) => {
                  trigger.current = element;
                  setSelected(records);
                }}
              />
            ))}
          </div>
          {groups.length > limit && (
            <button
              className={styles["load-more"]}
              onClick={() => setLimit((n) => n + 60)}
            >
              Show more records
            </button>
          )}
        </>
      )}
      {selected && (
        <RecordDetails
          group={selected}
          years={years}
          masters={lookup.masters}
          onClose={close}
          onSave={collection.saveYear}
        />
      )}
    </section>
  );
}
