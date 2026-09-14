export type AuthUser = {
  id: number;
  username: string;
  display_name: string;
  created_at: string;
  updated_at: string;
  is_admin: boolean;
};

export type AuthResponse = {
  user: AuthUser | null;
};

export type LoginRequest = {
  username: string;
  password: string;
};

export type SignupRequest = {
  username: string;
  display_name: string;
  password: string;
  invite_code: string;
};

export type AdminPasswordResetRequest = {
  username: string;
};

export type AdminPasswordResetResponse = {
  username: string;
  display_name: string;
  temporary_password: string;
};
