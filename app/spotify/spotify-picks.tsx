"use client";

import {
  ArrowClockwiseIcon,
  StopIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { spotifyRecommendations } from "../../lib/spotify-recommendations";
import { originalYear } from "../../lib/collection";
import { YearStatus } from "../collection/year-status";
import { useCollectionSource } from "../collection/collection-source";
import { useCollection } from "../collection/use-collection";
import { useMasterYears } from "../collection/use-master-years";
import { useTypedText } from "../components/use-typed-text";
import { ExploreHelp } from "./explore-help";
import { SpotifyResults } from "./spotify-results";
import styles from "./spotify-picks.module.css";
import interaction from "../components/interaction.module.css";

type Results = Awaited<ReturnType<typeof spotifyRecommendations>>;

type Status =
  | { phase: "idle" | "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; results: Results; yearProgress: number };

type Connection = { key: string; expires: number };

// Keep one completed result in browser memory across navigation.
let savedPicks: { key: string; username: string; results: Results } | undefined;

export function SpotifyPicks({
  connection,
}: {
  connection: Connection | null;
}) {
  const username = useCollectionSource()?.username ?? "";
  return (
    <SpotifyCollectionPicks
      key={username}
      connection={connection}
      username={username}
    />
  );
}

function SpotifyCollectionPicks({
  connection,
  username,
}: {
  connection: Connection | null;
  username: string;
}) {
  const collection = useCollection(username);
  const lookup = useMasterYears(collection.entries, collection.loading);
  const [status, setStatus] = useState<Status>(() =>
    connection &&
    connection.expires > Date.now() &&
    savedPicks?.key === connection.key &&
    savedPicks.username === username
      ? { phase: "ready", results: savedPicks.results, yearProgress: 0 }
      : { phase: "idle" },
  );
  useEffect(() => {
    if (
      savedPicks?.key !== connection?.key ||
      savedPicks?.username !== username
    )
      savedPicks = undefined;
  }, [connection?.key, username]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function stopSearch() {
    request.current?.abort();
    request.current = null;
    setStatus({ phase: "idle" });
  }

  async function load(refresh = lookup.progress > 0) {
    if (request.current) return;
    savedPicks = undefined;
    const controller = new AbortController();
    request.current = controller;
    setStatus({ phase: "loading" });
    try {
      const params = new URLSearchParams();
      if (refresh) params.set("refresh", "1");
      if (username) params.set("username", username);
      const query = params.toString();
      const response = await fetch(
        query ? `/api/spotify/recent?${query}` : "/api/spotify/recent",
        {
          method: "POST",
          cache: "no-store",
          signal: controller.signal,
        },
      );
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok) {
        if (connection && connection.expires > Date.now())
          savedPicks = { key: connection.key, username, results: data };
        setStatus({
          phase: "ready",
          results: data,
          yearProgress: lookup.progress,
        });
      } else setStatus({ phase: "error", message: data.error });
    } catch {
      if (!controller.signal.aborted)
        setStatus({
          phase: "error",
          message: "Couldn’t load your picks. Try again.",
        });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  const knownYears = collection.entries.filter(
    (record) => originalYear(record, lookup.masters).year !== null,
  ).length;
  const results = status.phase === "ready" ? status.results : null;
  const picksLoading = status.phase === "loading";
  const canPick =
    !collection.loading && !collection.error && collection.entries.length > 0;

  return (
    <section
      className={styles.spotifyPicks}
      data-results={!!results}
      aria-labelledby="explore-title"
    >
      <div className={styles.exploreHeader}>
        <div className={styles.exploreHeading}>
          <h2 id="explore-title">Explore</h2>
          <ExploreHelp />
        </div>
        {results && (
          <button
            className={`${interaction.quiet} ${styles.refreshPicks}`}
            onClick={() => load(true)}
            disabled={!canPick}
          >
            <ArrowClockwiseIcon size={18} aria-hidden="true" />
            Refresh picks
          </button>
        )}
      </div>
      {!results && (
        <p className={styles.exploreIntro}>
          Find your next spin from recent plays.
        </p>
      )}
      {!results && collection.loading && !collection.refreshing && (
        <p role="status">Opening the Discogs collection…</p>
      )}
      {collection.error && (
        <div role="alert">
          <p>We couldn’t open the collection. {collection.error}</p>
          <button className={interaction.filled} onClick={collection.refresh}>
            Try loading again
          </button>
        </div>
      )}
      {!collection.loading &&
        !collection.error &&
        !collection.entries.length && (
          <p>
            {username
              ? "This public collection is empty."
              : "Add records to your Discogs collection to get Spotify picks."}
          </p>
        )}
      {!results && (
        <div className={styles.pickStage} data-testid="explore-pick-stage">
          <div className={styles.tuner} data-tuning={picksLoading}>
            <div className={styles.tunerDial} aria-hidden="true">
              <TunerReadout tuning={picksLoading} />
              <span className={styles.tunerSignal}>
                <span />
                <span />
                <span />
                <span />
              </span>
            </div>
            <div className={styles.tunerDials} aria-hidden="true">
              <span className={styles.tunerKnob} />
              <span
                className={`${styles.tunerKnob} ${styles.tunerKnobSmall}`}
              />
            </div>
            <div className={styles.tunerControls}>
              <button
                className={styles.tunerButton}
                type="button"
                disabled={!canPick || picksLoading}
                aria-busy={picksLoading || undefined}
                aria-label="Find my picks from recent Spotify plays"
                onClick={() => load()}
              >
                Find my picks
              </button>
              <button
                className={styles.tunerStop}
                type="button"
                disabled={!picksLoading}
                aria-label="Stop search"
                onClick={stopSearch}
              >
                <StopIcon size={20} weight="fill" aria-hidden="true" />
              </button>
            </div>
            {picksLoading && (
              <span className={styles.loadingAnnouncement} role="status">
                Finding your picks
              </span>
            )}
          </div>
        </div>
      )}
      <div aria-live="polite">
        {status.phase === "error" && <p>{status.message}</p>}
        {results?.warning && <p>{results.warning}</p>}
        {results && !results.recommended.length && !results.onShelf.length && (
          <p>
            {results.hasRecentPlays
              ? "No strong matches in this collection."
              : "Spotify returned no recent plays."}{" "}
            <Link href="/">Try Surprise Me</Link>.
          </p>
        )}
        {results && <SpotifyResults {...results} username={username} />}
      </div>
      {!collection.error && collection.entries.length > 0 && (
        <details className={styles.yearLookup}>
          <summary>
            <span>Original release years</span>
            {lookup.pendingCount > 0 && !lookup.resolving && (
              <span className={styles.yearAlert}>
                <WarningCircleIcon size={16} weight="fill" aria-hidden="true" />
                {lookup.pendingCount}{" "}
                {lookup.pendingCount === 1 ? "album" : "albums"} to check
              </span>
            )}
          </summary>
          <YearStatus
            lookup={lookup}
            known={knownYears}
            count={collection.entries.length}
            loading={collection.loading}
            resolveLabel="Resolve missing years"
          />
          {status.phase === "ready" &&
            lookup.status === "done" &&
            lookup.progress !== status.yearProgress && (
              <p>Refresh picks to include newly resolved years.</p>
            )}
        </details>
      )}
    </section>
  );
}

const tuningMessages = [
  "Reading plays",
  "Scanning shelf",
  "Checking Discogs",
  "Matching styles",
  "Linking records",
  "Ranking picks",
];

function TunerReadout({ tuning }: { tuning: boolean }) {
  const text = useTypedText(tuningMessages, "Seeking…", !tuning, true);
  return (
    <span className={styles.tunerReadout} data-testid="tuner-readout">
      {tuning ? text : "Ready to tune"}
    </span>
  );
}
