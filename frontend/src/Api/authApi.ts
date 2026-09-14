import type {
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AuthResponse,
  LoginRequest,
  SignupRequest
} from "../Types/authTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseResponse<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `${fallbackMessage} (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export async function fetchCurrentUser(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: "include"
  });
  return parseResponse<AuthResponse>(response, "Could not check your session");
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse<AuthResponse>(response, "Could not log in");
}

export async function signup(request: SignupRequest): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse<AuthResponse>(response, "Could not create account");
}

export async function logout(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  return parseResponse<AuthResponse>(response, "Could not log out");
}

export async function resetUserPassword(
  request: AdminPasswordResetRequest
): Promise<AdminPasswordResetResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/admin/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  return parseResponse<AdminPasswordResetResponse>(response, "Could not reset password");
}
