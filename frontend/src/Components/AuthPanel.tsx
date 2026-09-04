import { useState, type FormEvent } from "react";
import type { AuthUser, LoginRequest, SignupRequest } from "../Types/authTypes";

type AuthPanelProps = {
  user: AuthUser | null;
  isLoading: boolean;
  isSaving: boolean;
  onLogin: (request: LoginRequest) => Promise<void>;
  onLogout: () => Promise<void>;
  onSignup: (request: SignupRequest) => Promise<void>;
};

type AuthMode = "login" | "signup";

export default function AuthPanel({
  user,
  isLoading,
  isSaving,
  onLogin,
  onLogout,
  onSignup
}: AuthPanelProps) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const submitAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
  };

  if (user) {
    return (
      <section className="control-panel auth-panel">
        <div className="control-heading">
          <span>Account</span>
          <strong>{user.display_name || user.username}</strong>
        </div>
        <p className="auth-help-text">@{user.username}</p>
        <button disabled={isSaving} type="button" onClick={() => void onLogout()}>
          {isSaving ? "Signing out..." : "Log Out"}
        </button>
      </section>
    );
  }

  return (
    <section className="control-panel auth-panel">
      <div className="control-heading">
        <span>Account</span>
        <strong>{isLoading ? "Checking..." : "Sign in"}</strong>
      </div>

      <div className="segmented-control auth-mode-control" role="group" aria-label="Auth mode">
        <button
          className={mode === "login" ? "active" : ""}
          disabled={isSaving}
          type="button"
          onClick={() => setMode("login")}
        >
          Login
        </button>
        <button
          className={mode === "signup" ? "active" : ""}
          disabled={isSaving}
          type="button"
          onClick={() => setMode("signup")}
        >
          Signup
        </button>
      </div>

      <form className="auth-form" onSubmit={(event) => void submitAuth(event)}>
        <label>
          Username
          <input
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

        <button className="primary-button" disabled={isSaving || isLoading} type="submit">
          {isSaving ? "Working..." : mode === "login" ? "Login" : "Create Account"}
        </button>
      </form>
    </section>
  );
}
