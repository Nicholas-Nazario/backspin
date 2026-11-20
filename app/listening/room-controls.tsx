import {
  ArrowLeftIcon,
  InfoIcon,
  PaletteIcon,
  PauseIcon,
  PlayIcon,
  SunHorizonIcon,
} from "@phosphor-icons/react";
import {
  roomLightings,
  type LightingPreference,
  type RoomLighting,
} from "../../lib/room-lighting";
import { Cover } from "../collection/record-card";
import { ListeningActions } from "./listening-actions";
import type { useListening } from "./use-listening";
import styles from "./room-controls.module.css";

export function RoomControls({
  listening,
  disabled,
  changing,
  motionEnabled,
  reducedMotion,
  onMotionChange,
  lighting,
  lightingPreference,
  onLightingChange,
  onClose,
  onStop,
  onDetails,
  onCredits,
}: {
  listening: ReturnType<typeof useListening>;
  disabled: boolean;
  changing: boolean;
  motionEnabled: boolean;
  reducedMotion: boolean;
  onMotionChange: (enabled: boolean) => void;
  lighting: RoomLighting;
  lightingPreference: LightingPreference;
  onLightingChange: (preference: LightingPreference) => void;
  onClose: () => void;
  onStop: () => void;
  onDetails: () => void;
  onCredits: () => void;
}) {
  const next = disabled ? null : listening.next;
  const motionOn = motionEnabled && !reducedMotion;
  return (
    <nav className={styles.controls} aria-label="Listening room controls">
      <button autoFocus onClick={onClose}>
        <ArrowLeftIcon size={20} aria-hidden="true" /> Return to mix
      </button>
      <div className={styles.playback}>
        <ListeningActions
          listening={listening}
          onStop={onStop}
          disabled={disabled}
        />
        {!disabled && (
          <aside
            className={styles.preview}
            aria-label="Next record"
            data-record-id={next?.instance_id}
          >
            {next ? (
              <>
                <div className={styles.cover}>
                  <Cover
                    key={`${next.instance_id}:${next.basic_information.cover_image || next.basic_information.thumb || "missing"}`}
                    entry={next}
                    fullArtwork
                  />
                </div>
                <div className={styles.previewText}>
                  <span className={styles.eyebrow}>Up next</span>
                  <strong title={next.basic_information.title}>
                    {next.basic_information.title}
                  </strong>
                  <span
                    title={next.basic_information.artists
                      .map((artist) => artist.name)
                      .join(", ")}
                  >
                    {next.basic_information.artists
                      .map((artist) => artist.name)
                      .join(", ") || "Artist unknown"}
                  </span>
                </div>
              </>
            ) : (
              <span>No next record</span>
            )}
          </aside>
        )}
      </div>
      <label className={styles.lighting}>
        <span>
          <SunHorizonIcon size={18} aria-hidden="true" /> Lighting
        </span>
        <select
          aria-label="Room lighting"
          value={lightingPreference}
          title="Automatic: dawn 5–8am, day 8am–5pm, dusk 5–8pm, night 8pm–5am"
          onChange={(event) =>
            onLightingChange(event.target.value as LightingPreference)
          }
        >
          <option value="auto">
            Automatic · {lighting[0].toUpperCase() + lighting.slice(1)}
          </option>
          {roomLightings.map((value) => (
            <option key={value} value={value}>
              {value[0].toUpperCase() + value.slice(1)}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.secondary}>
        <button
          aria-label="Scene motion"
          aria-pressed={motionOn}
          disabled={reducedMotion}
          title={
            reducedMotion
              ? "Motion is off for your reduced-motion preference"
              : undefined
          }
          onClick={() => onMotionChange(!motionEnabled)}
        >
          {motionOn ? (
            <PauseIcon size={20} aria-hidden="true" />
          ) : (
            <PlayIcon size={20} aria-hidden="true" />
          )}
          {motionOn ? "Pause motion" : "Motion off"}
        </button>
        <button disabled={disabled || changing} onClick={onDetails}>
          <InfoIcon size={20} aria-hidden="true" /> Record details
        </button>
        <button onClick={onCredits}>
          <PaletteIcon size={20} aria-hidden="true" /> Artwork credits
        </button>
      </div>
    </nav>
  );
}
