"use client";
import { ShuffleDeck } from "../components/shuffle-deck";
import { useMix } from "./use-mix";
import { useState } from "react";
import {
  ShuffleIcon,
  XIcon,
  SlidersHorizontalIcon,
  CaretDownIcon,
} from "@phosphor-icons/react";
import { Entry } from "../../lib/collection";
import { VarietyLevel } from "../../lib/random-set";
import { useListening } from "../listening/use-listening";
import type { LightingPreference } from "../../lib/room-lighting";
import { ListeningRoom } from "../listening/listening-room";
import { ListeningControls } from "../listening/listening-controls";
import { MixQueue } from "./mix-queue";

import { MixModePicker } from "./mix-mode";
import type { useMasterYears } from "../collection/use-master-years";
import styles from "./random-set.module.css";

export function RandomSet({
  standalone = false,
  entries,
  corrections,
  masters,
  yearLookup,
  disabled,
  collectionError,
  onRefresh,
  onOpen,
}: {
  standalone?: boolean;
  entries: Entry[];
  corrections: Record<number, number>;
  masters: Record<number, number | null>;
  yearLookup: ReturnType<typeof useMasterYears>;
  disabled: boolean;
  collectionError: string;
  onRefresh: () => void;
  onOpen: (group: Entry[], trigger: HTMLElement) => void;
}) {
  const [lightingPreference, setLightingPreference] =
    useState<LightingPreference>("auto");
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [roomOpen, setRoomOpen] = useState(false);
  const [open, setOpen] = useState(standalone);
  const mix = useMix(entries, corrections, masters, disabled, open);
  const {
    count,
    setCount,
    variety,
    setVariety,
    generated,
    pinned,
    message,
    revealing,
    available,
    optionsKey,
    selected,
    pinnedCount,
    shuffle,
    swap,
    remove,
  } = mix;
  const listening = useListening(entries, selected);
  return (
    <section className={styles.sets} aria-label="Random set builder">
      {!standalone && (
        <button
          className={styles.open}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <ShuffleIcon size={18} aria-hidden="true" />
          Make a random set
        </button>
      )}
      {open && (
        <div className={styles.panel}>
          {!standalone && (
            <div className={styles.heading}>
              <div>{!standalone && <h3>Mix a set</h3>}</div>
              {!standalone && (
                <button
                  className={styles.close}
                  aria-label="Close random set builder"
                  onClick={() => setOpen(false)}
                >
                  <XIcon size={18} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <MixModePicker
            entries={entries}
            corrections={corrections}
            masters={masters}
            target={mix.target}
            onChange={mix.setTarget}
            yearLookup={yearLookup}
            disabled={disabled}
          />
          <div className={styles.controls}>
            <div className={styles.countControl}>
              <div>
                <label htmlFor="set-album-count">How many records?</label>
                <input
                  id="set-album-count"
                  aria-label="Albums in set"
                  type="number"
                  min={Math.max(1, pinnedCount)}
                  step="1"
                  value={count || ""}
                  onChange={(event) => setCount(Number(event.target.value))}
                />
              </div>
            </div>
            <button
              className={styles.shuffle}
              disabled={
                disabled ||
                !available ||
                !mix.ready ||
                !!mix.incompatiblePins.length ||
                revealing ||
                !Number.isInteger(count) ||
                count < Math.max(1, pinnedCount)
              }
              onClick={shuffle}
            >
              <ShuffleIcon size={18} aria-hidden="true" />
              {revealing
                ? "Digging through the crates…"
                : generated
                  ? "Shuffle again"
                  : "Mix my set"}
            </button>
            <details className={styles.tuning}>
              <summary>
                <SlidersHorizontalIcon size={16} aria-hidden="true" />
                Fine-tune the mix
                <CaretDownIcon size={13} aria-hidden="true" />
              </summary>
              <div className={styles.tuningBody}>
                <label className={styles.sizeSlider}>
                  Set size{" "}
                  <input
                    aria-label="Set size"
                    type="range"
                    min={Math.max(1, pinnedCount)}
                    max={Math.max(1, available, count)}
                    step="1"
                    value={count || 1}
                    onChange={(event) => setCount(Number(event.target.value))}
                  />
                </label>{" "}
                <fieldset>
                  <legend>Variety</legend>
                  {(
                    [
                      ["artists", "Artist variety"],
                      ["genres", "Genre variety"],
                      ["eras", "Era variety"],
                    ] as const
                  ).map(([key, label]) => (
                    <div className={styles.variety} key={key}>
                      <label htmlFor={"variety-" + key}>
                        {label}
                        <strong>
                          {["Not much", "Some", "A lot"][variety[key]]}
                        </strong>
                      </label>
                      <input
                        id={"variety-" + key}
                        type="range"
                        min="0"
                        max="2"
                        step="1"
                        value={variety[key]}
                        aria-valuetext={
                          ["Not much", "Some", "A lot"][variety[key]]
                        }
                        onChange={(event) =>
                          setVariety((current) => ({
                            ...current,
                            [key]: Number(event.target.value) as VarietyLevel,
                          }))
                        }
                      />
                      <div className={styles.scale} aria-hidden="true">
                        <span>Not much</span>
                        <span>Some</span>
                        <span>A lot</span>
                      </div>
                    </div>
                  ))}
                </fieldset>
              </div>
            </details>
          </div>
          {!!mix.incompatiblePins.length && mix.ready && (
            <p role="status">
              {mix.incompatiblePins.length} pinned{" "}
              {mix.incompatiblePins.length === 1
                ? "record doesn’t"
                : "records don’t"}{" "}
              match this mode.{" "}
              <button
                className={styles.releasePins}
                onClick={mix.releaseIncompatiblePins}
              >
                Release these pins
              </button>
            </p>
          )}
          {count < pinnedCount && (
            <p role="status">
              Keep at least {pinnedCount} records, or unpin a record for a
              shorter mix.
            </p>
          )}
          {disabled && (
            <p role="status">Waiting for your collection to finish loading.</p>
          )}
          {!disabled && mix.ready && !available && (
            <p role="status">
              {entries.length
                ? "No albums match this mode. Try a different selection."
                : "Your collection is empty. Add records on Discogs, then refresh."}
            </p>
          )}
          {revealing && !disabled && (
            <div className={styles.suspense} role="status">
              <ShuffleDeck />
              <strong>Cueing up your next session…</strong>
              <span>Finding the next records for your rotation.</span>
            </div>
          )}
          {!disabled && (
            <ListeningControls
              listening={listening}
              onEnterRoom={() => setRoomOpen(true)}
            />
          )}
          {generated && !disabled && !revealing && (
            <>
              {generated.ids.length < generated.requestedCount && (
                <p role="status">
                  Only {selected.length} albums available for this mix.
                </p>
              )}
              {generated.optionsKey !== optionsKey && (
                <p className={styles.note}>
                  Options changed. Shuffle again to apply them to this set.
                </p>
              )}
              {selected.length !== generated.ids.length && (
                <p className={styles.note}>
                  Some records are no longer in your collection. Shuffle again
                  for an updated set.
                </p>
              )}
              {pinnedCount > 0 && (
                <p className={styles.note}>
                  {pinnedCount} pinned · reshuffle keeps these records.
                </p>
              )}
              {message && <p role="status">{message}</p>}
              <MixQueue
                entries={selected}
                currentId={listening.currentId}
                onListen={listening.start}
                pinned={pinned}
                canSwap={mix.canSwap}
                corrections={corrections}
                masters={masters}
                onOpen={onOpen}
                onPin={mix.pin}
                onSwap={swap}
                onReorder={mix.reorder}
                onRemove={remove}
              />
            </>
          )}
        </div>
      )}
      {roomOpen && (
        <ListeningRoom
          lightingPreference={lightingPreference}
          onLightingChange={setLightingPreference}
          entries={entries}
          motionEnabled={motionEnabled}
          onMotionChange={setMotionEnabled}
          listening={listening}
          corrections={corrections}
          masters={masters}
          busy={disabled && !collectionError}
          error={collectionError}
          onRetry={onRefresh}
          onClose={() => setRoomOpen(false)}
        />
      )}
    </section>
  );
}
