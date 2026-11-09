# Finances UI

Angular frontend for [finances-service](../finances-service): accounts (shareable between users), planned one-time
and recurring transactions, cash-flow forecasts and a credit-card cycle budget.

The API reference is `finances-service/API_DOCUMENTATION.md`; where it and the backend code disagree, the code wins.

## Running locally

1. Start the backend (VS Code launch configuration **Finances Service (local, H2)**). It listens on
   `http://localhost:8080` and allows browser calls from `http://localhost:4200`. The admin account comes from
   `APP_ADMIN_EMAIL` / `APP_ADMIN_PASSWORD` in the service's `.env`.
2. Install and start the frontend:

   ```bash
   npm install
   npm start
   ```

3. Open `http://localhost:4200` and sign in. There is no public sign-up: an admin adds people under
   **Manage users**.

The API URL is set in `src/environments/environment*.ts` (`apiUrl`).

### Google sign-in (optional)

Set `googleClientId` in `src/environments/environment*.ts` to the same OAuth Web client ID as the backend's
`APP_GOOGLE_CLIENT_ID`. The button only appears when it's set. Setup steps are in
`finances-service/docs/google-sign-in.md`.

## How it fits together

- **Auth** (`services/auth.service.ts`, `interceptors/auth.interceptor.ts`): the access token is kept in memory only;
  the refresh token is an HttpOnly cookie the browser sends to `/api/v1/auth/*`. The interceptor adds the bearer
  token, refreshes once on a 401 and retries, and sends you to `/login` when the session is over. Refreshes are
  shared within a tab and serialized across tabs (a refresh token works only once). On reload, the app restores the
  session from the cookie before the first route loads.
- **Roles**: on each account you're `OWNER`, `EDITOR` or `VIEWER` (`account.myRole`); the UI hides what you can't
  do and the server enforces it. `ADMIN` users also get **Manage users**.
- **Money** is whole dollars (the API sends integers). Use the `money` pipe to display amounts.
- **Server validation errors** (`fields` in the error body) are shown under the matching form fields by
  `shared/form-errors.ts`.
- The app is zoneless: component state lives in signals.

## Commands

| Command | What it does |
|---|---|
| `npm start` | Dev server on `http://localhost:4200` with live reload |
| `npm run build` | Production build into `dist/` |
| `npm test` | Unit tests (Vitest) |
