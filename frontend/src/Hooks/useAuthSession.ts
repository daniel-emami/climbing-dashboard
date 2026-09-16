import { useCallback, useEffect, useState } from "react";

import {
  fetchCurrentUser,
  login as loginUser,
  logout as logoutUser,
  resetUserPassword,
  signup as signupUser
} from "../Api/authApi";
import type {
  AdminPasswordResetRequest,
  AdminPasswordResetResponse,
  AuthUser,
  LoginRequest,
  SignupRequest
} from "../Types/authTypes";

type UseAuthSessionOptions = {
  onDataRefresh: () => Promise<void>;
  onError: (message: string | null) => void;
  onLogoutComplete: () => void;
};

export function useAuthSession({
  onDataRefresh,
  onError,
  onLogoutComplete
}: UseAuthSessionOptions) {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isAuthSaving, setIsAuthSaving] = useState(false);

  const loadCurrentAuthUser = useCallback(async () => {
    setIsAuthLoading(true);
    try {
      const payload = await fetchCurrentUser();
      setCurrentUser(payload.user);
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
    } finally {
      setIsAuthLoading(false);
    }
  }, [onError]);

  useEffect(() => {
    void loadCurrentAuthUser();
  }, [loadCurrentAuthUser]);

  const handleLogin = async (request: LoginRequest) => {
    setIsAuthSaving(true);
    try {
      const payload = await loginUser(request);
      setCurrentUser(payload.user);
      onError(null);
      await onDataRefresh();
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleSignup = async (request: SignupRequest) => {
    setIsAuthSaving(true);
    try {
      const payload = await signupUser(request);
      setCurrentUser(payload.user);
      onError(null);
      await onDataRefresh();
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleLogout = async () => {
    setIsAuthSaving(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      onLogoutComplete();
      onError(null);
      await onDataRefresh();
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  const handleResetPassword = async (
    request: AdminPasswordResetRequest
  ): Promise<AdminPasswordResetResponse> => {
    setIsAuthSaving(true);
    try {
      const payload = await resetUserPassword(request);
      onError(null);
      return payload;
    } catch (unknownError: unknown) {
      onError(unknownError instanceof Error ? unknownError.message : "Unknown auth error");
      throw unknownError;
    } finally {
      setIsAuthSaving(false);
    }
  };

  return {
    currentUser,
    handleLogin,
    handleLogout,
    handleResetPassword,
    handleSignup,
    isAuthLoading,
    isAuthSaving,
    setCurrentUser
  };
}
