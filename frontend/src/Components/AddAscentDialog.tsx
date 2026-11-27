import { useEffect, useRef, type ComponentProps } from "react";
import { BoulderForm } from "../Features/Logbook";
import styles from "./AddAscentDialog.module.css";

type AddAscentDialogProps = {
  isOpen: boolean;
  isSignedIn: boolean;
  error: string | null;
  formProps: ComponentProps<typeof BoulderForm>;
  onDismiss: () => void;
  onSignIn: () => void;
};

export default function AddAscentDialog({
  isOpen,
  isSignedIn,
  error,
  formProps,
  onDismiss,
  onSignIn
}: AddAscentDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      if (typeof dialog.showModal === "function") dialog.showModal();
      else dialog.setAttribute("open", "");
    } else if (!isOpen && dialog.open) {
      if (typeof dialog.close === "function") dialog.close();
      else dialog.removeAttribute("open");
    }
  }, [isOpen]);

  return (
    <dialog
      aria-labelledby="add-ascent-title"
      className={styles.dialog}
      onCancel={(event) => { event.preventDefault(); onDismiss(); }}
      onClick={(event) => { if (event.target === event.currentTarget) onDismiss(); }}
      ref={dialogRef}
    >
      <div className={styles.content}>
        <div className={styles.heading}>
          <div>
            <span className={styles.kicker}>Your logbook</span>
            <h2 id="add-ascent-title">Add Ascent</h2>
          </div>
          <button aria-label="Close Add Ascent" className={styles.closeButton} onClick={onDismiss} type="button">×</button>
        </div>
        {isSignedIn ? (
          <div className={styles.body}>
            {error && <p className={styles.error} role="alert">{error}</p>}
            <BoulderForm {...formProps} />
          </div>
        ) : (
          <div className={styles.signInPrompt}>
            <p>Sign in to add an ascent to your logbook.</p>
            <button className={styles.signInButton} onClick={onSignIn} type="button">Go to sign in</button>
          </div>
        )}
      </div>
    </dialog>
  );
}
