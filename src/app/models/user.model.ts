import { UserRole } from './auth.model';

export type { User, UserRole } from './auth.model';

export interface ChangePasswordRequest {
  currentPassword: string;
  /** 12–72 characters. Changing it ends all of the user's sessions. */
  newPassword: string;
}

/** Admin only. Leave `password` out for a user who will only sign in with Google. */
export interface CreateUserRequest {
  email: string;
  displayName: string;
  password?: string;
  role: UserRole;
}

/** Admin only. Setting `password` resets it; resetting it or disabling the user signs them out everywhere. */
export interface UpdateUserRequest {
  displayName: string;
  role: UserRole;
  enabled: boolean;
  password?: string;
}

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 72;
