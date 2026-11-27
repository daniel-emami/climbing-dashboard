import { useState, type FormEvent } from "react";
import type { AdminPasswordResetRequest, AdminPasswordResetResponse } from "../Types/authTypes";
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./AuthPanel.module.css";

type AdminPasswordResetPanelProps = {
  isSaving: boolean;
  onResetPassword: (request: AdminPasswordResetRequest) => Promise<AdminPasswordResetResponse>;
};

export default function AdminPasswordResetPanel({ isSaving, onResetPassword }: AdminPasswordResetPanelProps) {
  const [username, setUsername] = useState("");
  const [result, setResult] = useState<AdminPasswordResetResponse | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setIsCopied(false);
    try {
      setResult(await onResetPassword({ username }));
      setUsername("");
    } catch {
      // The dialog displays the error from the auth session.
    }
  };

  const copyPassword = async () => {
    if (!result) return;
    await navigator.clipboard.writeText(result.temporary_password);
    setIsCopied(true);
  };

  return (
    <form className={`${sharedStyles.controlPanel} ${styles.embedded}`} onSubmit={(event) => void submit(event)}>
      <label>
        Reset a user's password
        <div className={styles.resetRow}>
          <input required autoComplete="off" placeholder="Username" value={username} onChange={(event) => setUsername(event.target.value)} />
          <button className={sharedStyles.primaryButton} disabled={isSaving} type="submit">
            {isSaving ? "Generating..." : "Generate"}
          </button>
        </div>
      </label>
      {result && (
        <div className={styles.resetResult} role="status">
          <span>New password for <strong>@{result.username}</strong></span>
          <div className={styles.resetRow}>
            <input readOnly aria-label="Generated password" value={result.temporary_password} />
            <button type="button" onClick={() => void copyPassword()}>{isCopied ? "Copied" : "Copy"}</button>
          </div>
        </div>
      )}
    </form>
  );
}
