export const environment = {
  /** Same origin in production: the reverse proxy routes /api/* to the backend and everything else to the UI. */
  apiUrl: '/api/v1',
  /** OAuth Web client ID (same value as the backend's APP_GOOGLE_CLIENT_ID). Empty hides "Sign in with Google". */
  googleClientId: '',
};
