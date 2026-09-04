import type { AuthResponse, LoginRequest, SignupRequest } from "../Types/authTypes";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

async function parseAuthResponse(response: Response): Promise<AuthResponse> {
  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.detail ?? `Auth request failed with ${response.status}`);
  }
  return response.json() as Promise<AuthResponse>;
}

export async function fetchCurrentUser(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
    credentials: "include"
  });
  return parseAuthResponse(response);
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
  return parseAuthResponse(response);
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
  return parseAuthResponse(response);
}

export async function logout(): Promise<AuthResponse> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: "POST",
    credentials: "include"
  });
  return parseAuthResponse(response);
}
