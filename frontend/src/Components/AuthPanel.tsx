import { useState, type FormEvent, type Ref } from "react";
import type {
  LoginRequest,
  SignupRequest
} from "../Types/authTypes";
import sharedStyles from "../Styles/Shared.module.css";
import styles from "./AuthPanel.module.css";

type AuthPanelProps = {
  embedded?: boolean;
  hideHeading?: boolean;
  isLoading: boolean;
  isSaving: boolean;
  onLogin: (request: LoginRequest) => Promise<void>;
  onSignup: (request: SignupRequest) => Promise<void>;
  usernameInputRef?: Ref<HTMLInputElement>;
};

type AuthMode = "login" | "signup";

export default function AuthPanel({
  embedded = false,
  hideHeading = false,
  isLoading,
  isSaving,
  onLogin,
  onSignup,
  usernameInputRef
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      if (mode === "login") {
        await onLogin({ username, password });
      } else {
        await onSignup({
          username,
          display_name: displayName,
          password,
          invite_code: inviteCode
        });
      }
      setPassword("");
      setInviteCode("");
    } catch {
      // Keep the entered values in place while the parent displays the error.
    }
  };

  return (
    <section className={`${sharedStyles.controlPanel} ${embedded ? styles.embedded : ""}`}>
      {!hideHeading && <div className={sharedStyles.controlHeading}>
        <span>Account</span>
        <strong>{isLoading ? "Checking..." : "Login"}</strong>
      </div>}

      <div
        className={`${sharedStyles.segmentedControl} ${styles.modeControl}`}
        role="group"
        aria-label="Auth mode"
      >
        <button
          className={mode === "login" ? sharedStyles.active : ""}
          disabled={isSaving}
          type="button"
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          className={mode === "signup" ? sharedStyles.active : ""}
          disabled={isSaving}
          type="button"
          onClick={() => setMode("signup")}
        >
          Signup
        </button>
      </div>

      <form className={styles.form} onSubmit={(event) => void submitAuth(event)}>
        <label>
          Username
          <input
            ref={usernameInputRef}
            required
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
          />
        </label>

        {mode === "signup" && (
          <label>
            Display name
            <input
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
            />
          </label>
        )}

        <label>
          Password
          <input
            required
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>

        {mode === "signup" && (
          <label>
            Invite code
            <input
              required
              autoComplete="off"
              value={inviteCode}
              onChange={(event) => setInviteCode(event.target.value)}
            />
          </label>
        )}

        <button className={sharedStyles.primaryButton} disabled={isSaving || isLoading} type="submit">
          {isSaving ? "Working..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </section>
  );
}
