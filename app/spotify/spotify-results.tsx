import {
  CaretLeftIcon,
  CaretRightIcon,
  VinylRecordIcon,
} from "@phosphor-icons/react";
import { useId, useState, type ReactNode } from "react";
import type {
  Connection,
  RecentPick,
  ShelfPick,
} from "../../lib/recent-recommendation";
import { Cover } from "../collection/record-card";
import interaction from "../components/interaction.module.css";
import styles from "./spotify-picks.module.css";

const initialPickCount = 5;
const sourcesPerPage = 3;

export function SpotifyResults({
  recommended,
  onShelf,
}: {
  recommended: RecentPick[];
  onShelf: ShelfPick[];
}) {
  return (
    <>
      {recommended.length > 0 && (
        <MatchList
          title="Recommended from Your Collection"
          picks={recommended}
          renderPick={(pick) => <SpotifyConnection pick={pick} />}
        />
      )}
      {onShelf.length > 0 && (
        <MatchList
          title="Already On Your Shelf"
          subtitle="You've been listening to these on Spotify and they are in your collection"
          picks={onShelf}
          listClass={styles.shelfList}
          renderPick={(pick) => (
            <article>
              <ShelfRecord pick={pick} />
            </article>
          )}
        />
      )}
    </>
  );
}

function MatchList<Pick extends ShelfPick>({
  title,
  subtitle,
  picks,
  listClass,
  renderPick,
}: {
  title: string;
  subtitle?: string;
  picks: Pick[];
  listClass?: string;
  renderPick: (pick: Pick) => ReactNode;
}) {
  const [showAll, setShowAll] = useState(false);
  const visiblePicks = showAll ? picks : picks.slice(0, initialPickCount);
  return (
    <section className={styles.matchSection} aria-label={title}>
      <h3>{title}</h3>
      {subtitle && <p className={styles.matchSubtitle}>{subtitle}</p>}
      <ol className={`${styles.spotifyResults} ${listClass ?? ""}`}>
        {visiblePicks.map((pick) => (
          <li key={pick.key}>{renderPick(pick)}</li>
        ))}
      </ol>
      {!showAll && picks.length > initialPickCount && (
        <button className={interaction.filled} onClick={() => setShowAll(true)}>
          Show all matches
        </button>
      )}
    </section>
  );
}

function albumUrl(id: string) {
  return `https://open.spotify.com/album/${id}`;
}

function connectionLabel(connection: Connection) {
  switch (connection.kind) {
    case "style": {
      const caption =
        connection.styles.length === 1
          ? "Shared Discogs style"
          : "Shared Discogs styles";
      return `${caption}: ${connection.styles.slice(0, 2).join(", ")}`;
    }
    case "artist":
      return `Same artist · ${connection.artists.join(", ")}`;
    case "genre-era": {
      const caption =
        connection.genres.length === 1 ? "Shared genre" : "Shared genres";
      return `${caption}: ${connection.genres.join(", ")}`;
    }
    case "album":
      return "Same album";
  }
}

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
        <VinylRecordIcon size={36} weight="duotone" aria-hidden="true" />
      )}
    </div>
  );
}

function SpotifyConnection({ pick }: { pick: RecentPick }) {
  const { entry, matches } = pick;
  const [sourcePage, setSourcePage] = useState(0);
  const sourceListId = useId();
  const lastPage = Math.max(0, Math.ceil(matches.length / sourcesPerPage) - 1);
  const page = Math.min(sourcePage, lastPage);
  const start = page * sourcesPerPage;
  const end = Math.min(start + sourcesPerPage, matches.length);

  return (
    <article
      className={styles.recordMatch}
      aria-label={`Why we picked ${entry.basic_information.title}`}
    >
      <ShelfRecord pick={pick} />
      <div className={styles.matchEvidence}>
        <h5>
          Based on {matches.length} recently played{" "}
          {matches.length === 1 ? "album" : "albums"}
        </h5>
        {lastPage > 0 && (
          <div
            className={styles.sourcePager}
            role="group"
            aria-label="Recently played albums pagination"
          >
            <span role="status">
              {start + 1 === end ? end : `${start + 1}–${end}`} of{" "}
              {matches.length}
            </span>
            <button
              type="button"
              className={`${interaction.quiet} ${interaction.icon}`}
              aria-label="Previous supporting albums"
              aria-controls={sourceListId}
              disabled={page === 0}
              onClick={() => setSourcePage(page - 1)}
            >
              <CaretLeftIcon size={18} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={`${interaction.quiet} ${interaction.icon}`}
              aria-label="Next supporting albums"
              aria-controls={sourceListId}
              disabled={page === lastPage}
              onClick={() => setSourcePage(page + 1)}
            >
              <CaretRightIcon size={18} aria-hidden="true" />
            </button>
          </div>
        )}
        <ul
          id={sourceListId}
          className={styles.sourceList}
          data-paginated={lastPage > 0}
        >
          {matches.slice(start, end).map(({ play, connection, sourceYear }) => {
            const reason = connectionLabel(connection);
            const artist = play.artists.join(", ");
            return (
              <li key={play.albumId}>
                <SpotifyArtwork
                  key={play.artworkUrl}
                  artworkUrl={play.artworkUrl}
                />
                <div className={styles.sourceInfo}>
                  <a href={albumUrl(play.albumId)} title={play.album}>
                    {play.album}
                  </a>
                  <p className={styles.sourceByline}>
                    <span title={artist}>{artist}</span>
                    {sourceYear != null && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className={styles.releaseYear}>{sourceYear}</span>
                      </>
                    )}
                  </p>
                  <p className={styles.sourceReason} title={reason}>
                    {reason}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function ShelfRecord({ pick: { entry, year } }: { pick: ShelfPick }) {
  return (
    <div className={styles.shelfRecord}>
      <Cover entry={entry} />
      <h4>{entry.basic_information.title}</h4>
      <p>
        {entry.basic_information.artists.map(({ name }) => name).join(", ")}
      </p>
      {year != null && <p className={styles.releaseYear}>{year}</p>}
    </div>
  );
}
