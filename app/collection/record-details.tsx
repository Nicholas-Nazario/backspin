import { useEffect, useRef, useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { Entry, originalYear } from "../../lib/collection";
import styles from "./collection.module.css";
import { api } from "./api";
import { Cover } from "./record-card";
type Detail = {
  id: number;
  title: string;
  artists?: { name: string }[];
  genres?: string[];
  styles?: string[];
  extraartists?: { name: string; role: string }[];
  tracklist?: { position: string; title: string; duration?: string }[];
};
export function RecordDetails({
  group,

  masters,
  onClose,
}: {
  group: Entry[];

  masters: Record<number, number | null>;
  onClose: () => void;
}) {
  const [active, setActive] = useState<Entry>(group[0]),
    [detail, setDetail] = useState<Detail | null>(null),
    [detailError, setDetailError] = useState(""),
    [detailReload, setDetailReload] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  useEffect(() => {
    if (!active) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    setDetail(null);
    setDetailError("");

    api("/api/discogs?kind=release&id=" + active.id, controller.signal)
      .then((b) => {
        setDetail(b.data);
        timer = setTimeout(
          () => {
            setDetail(null);
            setDetailError(
              "Details expired. Refresh details to load them again.",
            );
          },
          Math.max(0, b.expiresAt - Date.now()),
        );
      })
      .catch((e) => {
        if (!controller.signal.aborted) setDetailError(e.message);
      });
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [active, detailReload]);
  const year = originalYear(active, masters).year;
  return (
    <dialog
      className={styles.dialog}
      ref={dialog}
      onCancel={() => {
        onClose();
      }}
      onClose={() => {
        onClose();
      }}
      aria-labelledby="record-title"
    >
      {active && (
        <>
          <button
            autoFocus
            className={styles["close"]}
            onClick={() => {
              onClose();
            }}
            aria-label="Close record details"
          >
            <XIcon size={20} aria-hidden="true" />
          </button>
          <div className={styles["detail-layout"]}>
            <div>
              <Cover key={active.instance_id} entry={active} />
              <a
                className={styles["attribution"]}
                href={"https://www.discogs.com/release/" + active.id}
                target="_blank"
                rel="noopener"
              >
                Data provided by Discogs.
              </a>
            </div>
            <div>
              <span className={styles["eyebrow"]}>On your shelf</span>
              <h2 id="record-title">{active.basic_information.title}</h2>
              <p className={styles["detail-artist"]}>
                {active.basic_information.artists.map((a) => a.name).join(", ")}
              </p>
              <p>
                Original release: <strong>{year ?? "Unknown"}</strong>{" "}
                <small>
                  {year === null ? "(not resolved)" : "(Discogs master)"}
                </small>
              </p>
              <div className={styles["chips"]}>
                {(detail?.genres || active.basic_information.genres || []).map(
                  (g) => (
                    <span key={g}>{g}</span>
                  ),
                )}
              </div>
              <h3>Styles</h3>
              <div className={[styles["chips"], styles["styles"]].join(" ")}>
                {(detail?.styles || active.basic_information.styles || []).map(
                  (g) => (
                    <span key={g}>{g}</span>
                  ),
                )}
              </div>
              {!detail && !detailError && <p role="status">Loading credits…</p>}
              {detailError && <p role="alert">{detailError}</p>}
              <button
                className={styles["text-button"]}
                onClick={() => setDetailReload((v) => v + 1)}
              >
                Refresh details
              </button>
              {detail?.extraartists && (
                <>
                  <h3>People behind the record</h3>
                  <ul className={styles["credits"]}>
                    {detail.extraartists.slice(0, 15).map((c, i) => (
                      <li key={i}>
                        <strong>{c.name}</strong>
                        <span>{c.role}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {group.length > 1 && (
                <label>
                  Owned editions
                  <select
                    value={active.instance_id}
                    onChange={(e) =>
                      setActive(
                        group.find(
                          (r) => r.instance_id === Number(e.target.value),
                        )!,
                      )
                    }
                  >
                    {group.map((r) => (
                      <option key={r.instance_id} value={r.instance_id}>
                        Release {r.id} · copy {r.instance_id}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          </div>
        </>
      )}
    </dialog>
  );
}
