import { AccessTokenResponse, User } from '../models/auth.model';

export const TEST_USER: User = {
  id: 1,
  email: 'me@example.com',
  displayName: 'Me',
  role: 'USER',
  enabled: true,
  passwordLogin: true,
  googleLinked: false,
  createdAt: '2026-11-09T14:32:58',
  updatedAt: '2026-11-09T14:32:58',
};

export function tokens(
  accessToken: string,
  expiresInMs = 15 * 60_000,
  user: User = TEST_USER,
): AccessTokenResponse {
  return {
    accessToken,
    tokenType: 'Bearer',
    expiresAt: new Date(Date.now() + expiresInMs).toISOString(),
    user,
  };
}

/** Lets promise-based steps (the refresh lock, firstValueFrom) run. */
export const flushMicrotasks = () => new Promise<void>((resolve) => setTimeout(resolve));
