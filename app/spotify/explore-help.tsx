import { LightbulbIcon, XIcon } from "@phosphor-icons/react";
import { useRef } from "react";
import { genreMatchYearWindow } from "../../lib/recent-recommendation";
import interaction from "../components/interaction.module.css";
import styles from "./spotify-picks.module.css";

export function ExploreHelp() {
  const dialog = useRef<HTMLDialogElement>(null);
  const iconButton = `${interaction.quiet} ${interaction.icon}`;

  return (
    <>
      <button
        className={iconButton}
        type="button"
        aria-label="How Explore picks work"
        aria-haspopup="dialog"
        onClick={() => dialog.current?.showModal()}
      >
        <LightbulbIcon size={23} aria-hidden="true" />
      </button>
      <dialog
        className={styles.exploreHelp}
        ref={dialog}
        aria-labelledby="explore-help-title"
        onClick={(event) => {
          if (event.target !== event.currentTarget) return;
          const { left, right, top, bottom } =
            event.currentTarget.getBoundingClientRect();
          if (
            event.clientX < left ||
            event.clientX > right ||
            event.clientY < top ||
            event.clientY > bottom
          )
            event.currentTarget.close();
        }}
      >
        <div className={styles.exploreHelpHeading}>
          <h3 id="explore-help-title">How Explore picks work</h3>
          <button
            className={iconButton}
            type="button"
            aria-label="Close Explore help"
            onClick={() => dialog.current?.close()}
          >
            <XIcon size={19} aria-hidden="true" />
          </button>
        </div>
        <p>
          Backspin compares your recent Spotify listening with the selected
          Discogs collection. It checks the Discogs catalog for releases it
          can’t match in that collection.
        </p>
        <ul>
          <li>
            <strong>Same artist.</strong> A record shares an artist with a
            recent play.
          </li>
          <li>
            <strong>Shared style.</strong> The releases have a specific Discogs
            tag in common, such as Neo Soul.
          </li>
          <li>
            <strong>Shared genre and era.</strong> The releases share a broad
            category, such as Hip Hop, and came out within{" "}
            {genreMatchYearWindow} years of each other.
          </li>
        </ul>
        <p>
          Newer plays carry more weight, and support from several distinct
          releases can lift a pick. Albums you played that are also in the
          collection appear in their own section.
        </p>
      </dialog>
    </>
  );
}
