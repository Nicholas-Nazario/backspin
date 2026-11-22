"use client";

import { useEffect, useRef } from "react";
import {
  GearSixIcon,
  SignOutIcon,
  ArrowUpRightIcon,
} from "@phosphor-icons/react";
import styles from "./settings-menu.module.css";
import interaction from "./interaction.module.css";

function connectionNotice(result: string | undefined) {
  switch (result) {
    case "connected":
      return "Spotify is connected.";
    case "disconnected":
      return "Spotify is disconnected from Backspin.";
    case "denied":
      return "Spotify connection was cancelled. Your other connections are unchanged.";
    case "error":
      return "Spotify couldn’t connect. Please try again.";
    case "unavailable":
      return "Spotify connection is unavailable right now.";
    default:
      return null;
  }
}

export function SettingsMenu({
  discogsUsername,
  discogsConfigured,
  spotifyDisplayName,
  spotifyConfigured,
  spotifyResult,
  returnTo,
}: {
  discogsUsername: string | null;
  discogsConfigured: boolean;
  spotifyDisplayName: string | null;
  spotifyConfigured: boolean;
  spotifyResult?: string;
  returnTo: "/" | "/collection";
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);
  const notice = connectionNotice(spotifyResult);

  useEffect(() => {
    const menu = details.current;
    if (!menu) return;

    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof Node && !menu.contains(event.target)) {
        menu.open = false;
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && menu.open) {
        event.preventDefault();
        menu.open = false;
        trigger.current?.focus();
      }
    };

    document.addEventListener("pointerdown", closeOutside, true);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside, true);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  return (
    <details ref={details} className={styles.settings} open={!!notice}>
      <summary
        ref={trigger}
        className={styles.trigger}
        aria-label="Settings"
        title="Settings"
      >
        <GearSixIcon size={18} aria-hidden="true" />
      </summary>
      <div className={styles.panel}>
        <h2>Connections</h2>
        <p className={styles.privacy}>
          <a href="/privacy">Privacy and connections</a>
        </p>
        {notice && (
          <p className={styles.notice} role="status">
            {notice}
          </p>
        )}
        <section
          className={styles.service}
          aria-labelledby="discogs-connection"
        >
          <h3 id="discogs-connection">Discogs</h3>
          <p className={styles.hint}>
            Your record collection and release details.
          </p>
          <p>
            {discogsUsername ? (
              <>
                Connected as <strong>{discogsUsername}</strong>
              </>
            ) : (
              "Not connected"
            )}
          </p>
          <form
            action={
              discogsUsername ? "/api/auth/disconnect" : "/api/auth/connect"
            }
            method="post"
          >
            <button
              className={interaction.filled}
              disabled={!discogsUsername && !discogsConfigured}
            >
              {discogsUsername ? (
                <SignOutIcon size={18} aria-hidden="true" />
              ) : (
                <ArrowUpRightIcon size={18} aria-hidden="true" />
              )}
              {discogsUsername ? "Disconnect Discogs" : "Connect Discogs"}
            </button>
          </form>
          <p className={styles.hint}>
            Disconnecting signs you out of Discogs in Backspin. You can also
            revoke access in{" "}
            <a
              href="https://www.discogs.com/settings/applications"
              target="_blank"
              rel="noopener noreferrer"
            >
              Discogs settings
            </a>
            .
          </p>
        </section>
        <section
          className={styles.service}
          aria-labelledby="spotify-connection"
        >
          <h3 id="spotify-connection">
            <a
              href="https://www.spotify.com/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                src="/spotify/spotify-logo-black.svg"
                alt="Spotify"
                width={110}
                height={30}
              />
            </a>
          </h3>
          <p className={styles.hint}>
            Connect your Spotify profile. Listening history and playback aren’t
            used yet.
          </p>
          <p>
            {spotifyDisplayName ? (
              <>
                Connected as <strong>{spotifyDisplayName}</strong>
              </>
            ) : (
              "Not connected"
            )}
          </p>
          <form
            action={
              spotifyDisplayName
                ? "/api/spotify/disconnect"
                : "/api/spotify/connect"
            }
            method="post"
          >
            <button
              className={interaction.filled}
              disabled={!spotifyDisplayName && !spotifyConfigured}
              name="returnTo"
              value={returnTo}
            >
              {spotifyDisplayName ? (
                <SignOutIcon size={18} aria-hidden="true" />
              ) : (
                <ArrowUpRightIcon size={18} aria-hidden="true" />
              )}
              {spotifyDisplayName ? "Disconnect Spotify" : "Connect Spotify"}
            </button>
          </form>
          <p className={styles.hint}>
            {spotifyDisplayName
              ? "This connection is temporary. Reconnect when it expires."
              : !spotifyConfigured
                ? "Spotify connection is not available yet."
                : "Spotify handles sign-in and permission to connect."}
          </p>
          <p className={styles.hint}>
            Disconnecting removes Spotify from this browser. To revoke
            permission at Spotify,{" "}
            <a
              href="https://www.spotify.com/account/apps/"
              target="_blank"
              rel="noopener noreferrer"
            >
              manage your apps
            </a>
            .
          </p>
        </section>
      </div>
    </details>
  );
}
