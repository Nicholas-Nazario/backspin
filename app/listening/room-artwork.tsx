import type { RoomLighting } from "../../lib/room-lighting";
import type { ShelfSlot, SwapPhase } from "../../lib/room-motion";
import { ArmDrawing, DiscDrawing, LeafDrawing } from "./room-parts";
import styles from "./room-motion.module.css";

function PlayerMotion({
  phase,
  alternate,
}: {
  phase: SwapPhase;
  alternate: boolean;
}) {
  return (
    <>
      {phase !== "file" && phase !== "take" && (
        <g transform="translate(1004 607)">
          <g className={styles.discTravel}>
            <g transform="scale(1 .42)">
              <g className={styles.discSpin} data-motion="disc">
                <DiscDrawing alternate={alternate} />
              </g>
            </g>
          </g>
        </g>
      )}
      <g transform="translate(1230 571)">
        <g className={styles.armLift}>
          <g transform="scale(1 .42)">
            <g className={styles.armSwing} data-motion="arm">
              <g transform="scale(1 2.38095238) translate(-1230 -571)">
                <ArmDrawing />
              </g>
            </g>
          </g>
        </g>
      </g>
    </>
  );
}

function MovingSleeve({
  incoming,
  alternate,
}: {
  incoming: boolean;
  alternate: boolean;
}) {
  return (
    <g transform="translate(1424 486)">
      <g
        className={incoming ? styles.takingRecord : styles.returningRecord}
        data-motion={incoming ? "taking" : "returning"}
      >
        <g className={styles.sleevePaper}>
          <rect
            x="-153"
            y="-153"
            width="306"
            height="306"
            rx="3"
            fill={
              incoming
                ? "var(--room-sleeve-incoming, #B7C8BE)"
                : "var(--room-sleeve-outgoing, #D8AD77)"
            }
            stroke="#302B24"
            strokeWidth="3"
          />
        </g>
        <DiscDrawing alternate={alternate} />
      </g>
    </g>
  );
}

function ShelfSlots({
  phase,
  occupiedSlot,
}: {
  phase: SwapPhase;
  occupiedSlot: ShelfSlot;
}) {
  const nextTaken = phase === "take" || phase === "place" || phase === "settle";
  const filledSlot = nextTaken ? (occupiedSlot === 0 ? 1 : 0) : occupiedSlot;
  return (
    <g transform="translate(420 0)">
      {filledSlot === 0 ? (
        <path
          d="M999 844L1012 842L1019 1150H1005Z"
          fill="#E2BD7D"
          stroke="#302B24"
          strokeWidth="2"
        />
      ) : (
        <path
          d="M1127 838L1140 836L1147 1144H1133Z"
          fill="#D38468"
          stroke="#302B24"
          strokeWidth="2"
        />
      )}
    </g>
  );
}

export function RoomArtwork({
  lighting,
  phase,
  occupiedSlot,
  active,
  hasRecord,
}: {
  lighting: RoomLighting;
  phase: SwapPhase;
  occupiedSlot: ShelfSlot;
  active: boolean;
  hasRecord: boolean;
}) {
  const placed = phase === "place" || phase === "settle";
  const alternate = placed ? occupiedSlot === 0 : occupiedSlot === 1;
  return (
    <>
      <svg
        className={`${styles.artwork} ${styles.desktopArtwork}`}
        viewBox="0 0 2240 1260"
        aria-hidden="true"
        data-phase={phase}
        data-slot={occupiedSlot}
        data-running={active && hasRecord}
      >
        <g transform="translate(2085 420)">
          <g className={styles.leafSway} data-motion="leaf">
            <g transform="translate(-1435 -420)">
              <LeafDrawing />
            </g>
          </g>
        </g>
        <ShelfSlots phase={phase} occupiedSlot={occupiedSlot} />
        <g
          transform="translate(420 0)"
          visibility={hasRecord ? "visible" : "hidden"}
        >
          <PlayerMotion phase={phase} alternate={alternate} />
        </g>
        {phase === "file" && (
          <MovingSleeve incoming={false} alternate={alternate} />
        )}
        {phase === "take" && <MovingSleeve incoming alternate={!alternate} />}
      </svg>
      <svg
        className={`${styles.artwork} ${styles.compactArtwork}`}
        viewBox="760 525 590 210"
        aria-hidden="true"
        data-phase="idle"
        data-running={active && hasRecord}
        data-record={hasRecord}
      >
        <image
          href={`/listening-room/turntable-${lighting}.svg`}
          x="760"
          y="525"
          width="590"
          height="210"
        />
        <g visibility={hasRecord ? "visible" : "hidden"}>
          <PlayerMotion phase="idle" alternate={alternate} />
        </g>
      </svg>
    </>
  );
}
