export type UserRole = 'USER' | 'ADMIN';

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: UserRole;
  enabled: boolean;
  /** Whether the user can sign in with a password (false for Google-only users). */
  passwordLogin: boolean;
  googleLinked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface GoogleLoginRequest {
  /** The credential returned by Google Identity Services. */
  idToken: string;
}

/** Returned by /auth/login, /auth/google and /auth/refresh. */
export interface AccessTokenResponse {
  accessToken: string;
  tokenType: 'Bearer';
  /** ISO instant, e.g. 2026-11-09T19:48:35Z */
  expiresAt: string;
  user: User;
}
