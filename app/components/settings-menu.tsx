"use client";

import { useEffect, useRef } from "react";
import { GearSixIcon, SignOutIcon } from "@phosphor-icons/react";
import styles from "../page.module.css";
import interaction from "./interaction.module.css";

export function SettingsMenu({ username }: { username: string }) {
  const details = useRef<HTMLDetailsElement>(null);
  const trigger = useRef<HTMLElement>(null);

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
    <details ref={details} className={styles.settings}>
      <summary
        ref={trigger}
        className={`${interaction.quiet} ${interaction.icon}`}
        aria-label="Settings"
        title="Settings"
      >
        <GearSixIcon size={18} aria-hidden="true" />
      </summary>
      <div className={styles["settings-menu"]}>
        <p>
          Connected as <strong>{username}</strong>
        </p>
        <form action="/api/auth/disconnect" method="post">
          <button className={interaction.filled}>
            <SignOutIcon size={18} aria-hidden="true" /> Disconnect
          </button>
        </form>
        <p className={styles.small}>
          Disconnect signs you out here. Revoke app access in Discogs settings
          to remove its authorization.
        </p>
      </div>
    </details>
  );
}
