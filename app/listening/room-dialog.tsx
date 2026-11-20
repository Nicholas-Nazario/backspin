import { useEffect, useRef, type ReactNode } from "react";
import { XIcon } from "@phosphor-icons/react";
import styles from "./listening-room.module.css";

export function RoomDialog({
  label,
  onClose,
  children,
}: {
  label: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const element = dialog.current!;
    element.showModal();
    return () => element.close();
  }, []);
  return (
    <dialog
      ref={dialog}
      className={styles.details}
      aria-label={label}
      onCancel={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }}
    >
      <button
        autoFocus
        onClick={onClose}
        aria-label={`Close ${label.toLowerCase()}`}
      >
        <XIcon size={20} aria-hidden="true" /> Close
      </button>
      {children}
    </dialog>
  );
}
