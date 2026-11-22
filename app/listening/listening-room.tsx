"use client";

import { useEffect, useRef, useState } from "react";
import { originalYear, type Entry } from "../../lib/collection";
import { Cover } from "../collection/record-card";
import { RoomControls } from "./room-controls";
import { useRoomLighting } from "./use-room-lighting";
import type { LightingPreference } from "../../lib/room-lighting";
import type { useListening } from "./use-listening";
import { ArtworkCredits } from "./artwork-credits";
import { RoomArtwork } from "./room-artwork";
import { useRoomMotion } from "./use-room-motion";
import motionStyles from "./room-motion.module.css";
import { RoomDialog } from "./room-dialog";
import styles from "./listening-room.module.css";

export function ListeningRoom({
  entries,
  lightingPreference,
  onLightingChange,
  motionEnabled,
  onMotionChange,
  listening,

  masters,
  busy,
  error,
  onRetry,
  onClose,
}: {
  entries: Entry[];
  lightingPreference: LightingPreference;
  onLightingChange: (preference: LightingPreference) => void;
  motionEnabled: boolean;
  onMotionChange: (enabled: boolean) => void;
  listening: ReturnType<typeof useListening>;

  masters: Record<number, number | null>;
  busy: boolean;
  error: string;
  onRetry: () => void;
  onClose: () => void;
}) {
  const lighting = useRoomLighting(lightingPreference);
  const scene = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [details, setDetails] = useState<"record" | "credits" | null>(null);
  useEffect(() => {
    const element = dialog.current!;
    const trigger = document.activeElement as HTMLElement | null;
    element.showModal();
    return () => {
      element.close();
      if (trigger?.isConnected) trigger.focus();
    };
  }, []);

  // Only current collection data is displayed. The selection ID stays with the mix
  // owner through a refresh, but expired artwork is never held in local state.
  const selected = busy || error ? null : listening.current;
  const motion = useRoomMotion(
    selected?.instance_id ?? null,
    motionEnabled,
    scene,
  );
  const current = selected
    ? entries.find((entry) => entry.instance_id === motion.displayedId) ||
      selected
    : null;
  const info = current?.basic_information;
  const artist =
    info?.artists.map((artist) => artist.name).join(", ") || "Artist unknown";
  const year = current ? originalYear(current, masters).year : null;
  const labels = [...new Set(info?.genres || [])].slice(0, 2);
  const longIdentity = (info?.title.length || 0) > 48 || artist.length > 65;

  function stop() {
    listening.stop();
    onClose();
  }

  return (
    <dialog
      ref={dialog}
      aria-label="Listening room"
      data-lighting={lighting}
      className={styles.room}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className={styles.viewport}>
        <div
          ref={scene}
          className={`${styles.scene} ${motionStyles.motion}`}
          data-testid="listening-scene"
          data-transition={motion.phase}
          data-motion-active={motion.active}
          data-presented-id={current?.instance_id}
        >
          <img
            className={styles.background}
            src={`/listening-room/${lighting}.svg`}
            alt=""
            aria-hidden="true"
          />
          <RoomArtwork
            lighting={lighting}
            phase={motion.phase}
            occupiedSlot={motion.occupiedSlot}
            active={motion.active}
            hasRecord={!!current}
          />
          {current && info ? (
            <>
              <div
                className={styles.jacket}
                key={`jacket:${current.instance_id}`}
                data-reveal={motion.active}
              >
                <Cover
                  key={`${current.instance_id}:${info.cover_image || info.thumb || "missing"}`}
                  entry={current}
                  fullArtwork
                />
              </div>
              <div
                className={styles.identity}
                key={`identity:${current.instance_id}`}
                data-long={longIdentity}
                data-reveal={motion.active}
              >
                <p className={styles.artist}>{artist}</p>
                <h2 className={styles.title}>{info.title}</h2>
                {(year || labels.length > 0) && (
                  <p className={styles.tags}>
                    {year && <span>{year}</span>}
                    {labels.map((label) => (
                      <span key={label}>{label}</span>
                    ))}
                  </p>
                )}
                <a
                  className={styles.attribution}
                  href={`https://www.discogs.com/release/${current.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Data provided by Discogs ↗
                </a>
              </div>
            </>
          ) : (
            <div
              className={styles.unavailable}
              role={error ? "alert" : "status"}
            >
              <h2>
                {busy
                  ? "Refreshing your collection…"
                  : error
                    ? "Your collection needs attention"
                    : "Choose a record"}
              </h2>
              <p>
                {error ||
                  (busy
                    ? "Your place in the mix is kept while your records refresh."
                    : listening.currentId === null
                      ? "Pick a record from your mix to enter the room."
                      : "This record is no longer available in your collection.")}
              </p>
              {error && <button onClick={onRetry}>Retry collection</button>}
            </div>
          )}
        </div>
      </div>
      <RoomControls
        listening={listening}
        disabled={!selected}
        changing={motion.phase !== "idle"}
        motionEnabled={motionEnabled}
        reducedMotion={motion.reduced}
        onMotionChange={onMotionChange}
        lighting={lighting}
        lightingPreference={lightingPreference}
        onLightingChange={onLightingChange}
        onClose={onClose}
        onStop={stop}
        onDetails={() => setDetails("record")}
        onCredits={() => setDetails("credits")}
      />
      <span className={styles.announcement} aria-live="polite">
        {current ? `Now playing ${artist} — ${info?.title}` : ""}
      </span>
      {details && (
        <RoomDialog
          label={details === "credits" ? "Artwork credits" : "Record details"}
          onClose={() => setDetails(null)}
        >
          {details === "credits" ? (
            <ArtworkCredits />
          ) : current && info ? (
            <>
              <h2>{info.title}</h2>
              <p>{artist}</p>
              {year && <p>Original release: {year}</p>}
              {!listening.inMix && <p>Outside this mix</p>}
              <a
                href={`https://www.discogs.com/release/${current.id}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View this release on Discogs
              </a>
            </>
          ) : (
            <p>Record information is currently unavailable.</p>
          )}
        </RoomDialog>
      )}
    </dialog>
  );
}
