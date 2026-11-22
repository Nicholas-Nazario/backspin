"use client";

import Link from "next/link";
import { ArrowRightIcon, VinylRecordIcon } from "@phosphor-icons/react";
import { useEffect, useRef, useState } from "react";
import {
  recentRecommendations,
  type RecentPlay,
} from "../../lib/recent-recommendation";
import { Cover } from "../collection/record-card";
import { useCollection } from "../collection/use-collection";
import { useMasterYears } from "../collection/use-master-years";
import styles from "./spotify-picks.module.css";
import interaction from "../components/interaction.module.css";

type Status =
  | { phase: "idle" | "loading" }
  | { phase: "error"; message: string }
  | { phase: "ready"; plays: RecentPlay[] };

export function SpotifyPicks() {
  const collection = useCollection();
  const lookup = useMasterYears(collection.entries, collection.loading);
  const [status, setStatus] = useState<Status>({ phase: "idle" });
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  function dismiss() {
    request.current?.abort();
    request.current = null;
    setStatus({ phase: "idle" });
  }

  async function load() {
    if (request.current) return;
    const controller = new AbortController();
    request.current = controller;
    setStatus({ phase: "loading" });
    try {
      const response = await fetch("/api/spotify/recent", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
      });
      const data = await response.json();
      if (controller.signal.aborted) return;
      if (response.ok) setStatus({ phase: "ready", plays: data.plays });
      else setStatus({ phase: "error", message: data.error });
    } catch {
      if (!controller.signal.aborted)
        setStatus({
          phase: "error",
          message: "Couldn’t load recent plays. Try again.",
        });
    } finally {
      if (request.current === controller) request.current = null;
    }
  }

  const picks =
    status.phase === "ready"
      ? recentRecommendations(collection.entries, status.plays, {
          corrections: collection.years,
          masters: lookup.masters,
        })
      : [];

  return (
    <section className={styles.spotifyPicks} aria-labelledby="explore-title">
      <h2 id="explore-title">Explore</h2>
      <p>
        Find records on your shelf with artists, styles, or eras in common with
        what you’ve been playing.
      </p>
      {collection.loading && !collection.refreshing && (
        <p role="status">Opening your Discogs collection…</p>
      )}
      {collection.error && (
        <div role="alert">
          <p>We couldn’t open your collection. {collection.error}</p>
          <button className={interaction.filled} onClick={collection.refresh}>
            Try loading again
          </button>
        </div>
      )}
      {!collection.loading &&
        !collection.error &&
        !collection.entries.length && (
          <p>Add records to your Discogs collection to get Spotify picks.</p>
        )}
      <div className={styles.spotifyActions}>
        <button
          className={interaction.filled}
          onClick={load}
          disabled={
            status.phase === "loading" ||
            collection.loading ||
            !!collection.error ||
            !collection.entries.length
          }
        >
          {status.phase === "ready"
            ? "Refresh Spotify picks"
            : "Pick from recent Spotify plays"}
        </button>
        {status.phase !== "idle" && (
          <button className={interaction.filled} onClick={dismiss}>
            {status.phase === "loading" ? "Cancel" : "Dismiss"}
          </button>
        )}
      </div>
      <div aria-live="polite">
        {status.phase === "loading" && (
          <p>Checking your recent Spotify plays…</p>
        )}
        {status.phase === "error" && <p>{status.message}</p>}
        {status.phase === "ready" && !picks.length && (
          <p>
            {status.plays.length
              ? "No strong matches in your collection."
              : "Spotify returned no recent plays."}{" "}
            <Link href="/">Try Surprise Me</Link>.
          </p>
        )}
        {picks.length > 0 && (
          <ol className={styles.spotifyResults}>
            {picks.map((pick) => (
              <li key={pick.key}>
                <SpotifyConnection pick={pick} />
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

type Pick = ReturnType<typeof recentRecommendations>[number];

function SpotifyArtwork({ artworkUrl }: { artworkUrl?: string }) {
  const [failed, setFailed] = useState(false);
  return (
    <div className={styles.spotifyArtwork}>
      {artworkUrl && !failed ? (
        <img
          src={artworkUrl}
          alt=""
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setFailed(true)}
        />
      ) : (
        <VinylRecordIcon
          size={36}
          weight="duotone"
          aria-label="No artwork available"
          role="img"
        />
      )}
    </div>
  );
}

function SpotifyConnection({
  pick: { entry, play, connection },
}: {
  pick: Pick;
}) {
  const label =
    connection.kind === "style"
      ? connection.styles.slice(0, 2).join(" · ")
      : connection.kind === "artist"
        ? connection.artists.join(", ")
        : "Same album";
  return (
    <article
      className={styles.spotifyConnection}
      aria-label={`Why we picked ${entry.basic_information.title}`}
    >
      <div className={styles.spotifyAlbum}>
        <p className={styles.spotifyCaption}>Recently played · Spotify</p>
        <a href={`https://open.spotify.com/album/${play.albumId}`}>
          <SpotifyArtwork key={play.artworkUrl} artworkUrl={play.artworkUrl} />
          <strong>{play.album}</strong>
        </a>
        <p>{play.artists.join(", ")}</p>
      </div>
      <div className={styles.spotifyBridge}>
        {connection.kind === "style" && (
          <p className={styles.spotifyCaption}>Shared Discogs style</p>
        )}
        {connection.kind === "artist" && (
          <p className={styles.spotifyCaption}>Same artist</p>
        )}
        <strong>{label}</strong>
        <ArrowRightIcon
          className={styles.spotifyArrow}
          size={24}
          aria-hidden="true"
        />
      </div>
      <div className={styles.spotifyAlbum}>
        <p className={styles.spotifyCaption}>Your Discogs shelf</p>
        <Cover entry={entry} />
        <h3>{entry.basic_information.title}</h3>
        <p>
          {entry.basic_information.artists.map(({ name }) => name).join(", ")}
        </p>
      </div>
    </article>
  );
}
