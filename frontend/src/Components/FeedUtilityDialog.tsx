import { useEffect, useId, useRef, type ReactNode, type RefObject } from "react";
import styles from "./FeedUtilityDialog.module.css";

type FeedUtilityDialogProps = {
  children: ReactNode;
  initialFocusRef?: RefObject<HTMLInputElement | null>;
  isOpen: boolean;
  onDismiss: () => void;
  title: string;
  variant: "drawer" | "signIn";
};

export default function FeedUtilityDialog({ children, initialFocusRef, isOpen, onDismiss, title, variant }: FeedUtilityDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
      initialFocusRef?.current?.focus();
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby={titleId}
      className={`${styles.dialog} ${variant === "drawer" ? styles.drawer : styles.signIn}`}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
      ref={dialogRef}
    >
      <div className={styles.content}>
        <div className={styles.heading}>
          <h2 id={titleId}>{title}</h2>
          <button aria-label={`Close ${title}`} className={styles.closeButton} onClick={onDismiss} type="button">×</button>
        </div>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
