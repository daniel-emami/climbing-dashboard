import { apiJson, apiJsonBody } from "./apiClient";
import type {
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AuthResponse,
  LoginRequest,
  SignupRequest
} from "../Types/authTypes";

export async function fetchCurrentUser(): Promise<AuthResponse> {
  return apiJson<AuthResponse>("/api/auth/me", {}, "Could not check your session");
}

export async function login(request: LoginRequest): Promise<AuthResponse> {
  return apiJsonBody<AuthResponse>(
    "/api/auth/login",
    request,
    { method: "POST" },
    "Could not log in"
  );
}

export async function signup(request: SignupRequest): Promise<AuthResponse> {
  return apiJsonBody<AuthResponse>(
    "/api/auth/signup",
    request,
    { method: "POST" },
    "Could not create account"
  );
}

export async function logout(): Promise<AuthResponse> {
  return apiJson<AuthResponse>("/api/auth/logout", { method: "POST" }, "Could not log out");
}

export async function resetUserPassword(
  request: AdminPasswordResetRequest
): Promise<AdminPasswordResetResponse> {
  return apiJsonBody<AdminPasswordResetResponse>(
    "/api/auth/admin/reset-password",
    request,
    { method: "POST" },
    "Could not reset password"
  );
}
