# Project Rules — Finances UI

Angular frontend for **finances-service** (`../finances-service`): accounts shared between users, categories,
planned one-time/recurring transactions, cash-flow forecasts and a credit-card cycle budget.
**Brand-new app with no outside users:** never add backward-compatibility code (redirects from old URLs, legacy
field mappings, deprecated aliases). Rename and remove things directly.

**The backend is the source of truth.** The API reference is `../finances-service/API_DOCUMENTATION.md`; when it and
the backend code disagree, the code wins. Before adding or changing a model field, read the matching DTO in
`../finances-service/src/main/java/com/narvalo/financesservice/dto/`. Never invent endpoints or fields.

## Identity
- **Tech**: Angular 21 (standalone, **zoneless**, signals) · TypeScript 5.9 strict + strict templates · RxJS 7.8 ·
  Bootstrap 5.3 + Bootstrap Icons · Vitest (via `@angular/build:unit-test`) · Prettier
- **API**: `environment.apiUrl` (`http://localhost:8080/api/v1` in both environments). The backend's CORS allows
  `http://localhost:4200` with credentials.

## Commands
| Command | Use |
|---|---|
| `npm start` | Dev server on :4200 (needs the backend on :8080) |
| `npx ng build` | Production build — must pass with no errors or warnings |
| `npx ng test --watch=false` | All unit tests, once |
| `npm run format` / `npm run format:check` | Prettier over `src/` (write / verify) |

After installing or removing a dependency, restart `ng serve` and hard-refresh the browser. A running dev server
keeps its old pre-bundled dependencies, and because every route is lazy-loaded, all pages then fail to load.

After any change, run `npm run format`, then the build and the tests. All three must be clean before you call the
work done. Formatting-only commits go in `.git-blame-ignore-revs`.

## Structure
```
src/app/
├── components/<name>/   one folder per component: .ts + .html (+ .css only if it has styles, + .spec.ts)
├── services/            all HTTP calls; one service per backend resource (AdminUserService lives in user.service.ts)
├── models/              TS types mirroring backend DTOs, plus small pure helpers (hasRole, hasCycleBudget,
│                        buildFrequencyPayload, apiErrorMessage)
├── interceptors/        auth.interceptor.ts (bearer token, refresh-and-retry, credentials on /auth)
├── guards/              authGuard, adminGuard, guestGuard
├── shared/              money.pipe.ts, dates.ts, form-errors.ts
└── testing/             fixtures for specs (auth-fixtures.ts, api-fixtures.ts)
```
Routes (`app.routes.ts`) are lazy `loadComponent`s. Everything except `/login` sits under the `authGuard` parent;
admin pages also need `adminGuard`.

## Core Non-Negotiables

### Angular style
- **Zoneless**: all component state lives in `signal` / `computed` / `toSignal`. Never assign plain fields inside a
  `subscribe` and never call `ChangeDetectorRef.detectChanges()`: without zone.js the view won't update.
- **`inject()`**, not constructor injection. Inputs use `input()` / `input.required()`.
- Standalone components only (no NgModules; don't write `standalone: true`, it's the default). Use built-in control
  flow (`@if`, `@for` with `track`, `@switch`), never `*ngIf`/`*ngFor`.
- Typed reactive forms via `FormBuilder` (`nonNullable` where it fits). Cross-field rules are plain validator
  functions on the group (see `statementWithinAmount`, `plannedTransactionRules`). Use `getRawValue()` when
  disabled controls must still be sent (e.g. an editor's locked account name).
- Read form values in templates through signals (`toSignal(control.valueChanges, { initialValue })`), not by
  calling `form.get(...).value` in conditionals.
- For a `<select>` whose options load asynchronously, bind `[selected]` on each `<option>`, not `[value]` on the
  `<select>` (that runs before the options exist).

### HTTP and auth
- **Components never use `HttpClient`.** Services do, and they return Observables typed with the models.
- Never set `Authorization` or `withCredentials` by hand: `authInterceptor` does both.
- The access token lives **only in memory** (`AuthService`). Never put tokens in localStorage or sessionStorage.
- Only `AuthService.refresh()` may call `/auth/refresh`. It shares one in-flight request and takes a Web Lock across
  tabs, because a refresh token works once and reuse signs out every session from that login.
- When the server has already ended the session (password change), call `AuthService.endSession(reason)`; the
  login page shows why.
- `AccountService.getAllAccounts()` shares concurrent requests but caches nothing. Don't add caching that could
  outlive a user switch or show stale balances.

### Backend contract
- **Money is whole dollars** (`Integer` in the API). Display with the `money` pipe (`| money`, or `| money: true` for
  signed changes). Validate with `Validators.pattern(/^-?\d+$/)` (or `/^\d+$/` where it can't be negative), and
  `step="1"` on inputs. No cents anywhere.
- **Dates** are `yyyy-MM-dd` strings in the user's local calendar. Use `shared/dates.ts` (`todayIso`, `addDaysIso`);
  never `new Date().toISOString().slice(0, 10)`, which is the UTC date.
- **Request and response types are separate** (e.g. `FrequencyRequest` vs `Frequency`), because responses carry
  read-only fields like `description`, `myRole`, `oneTime`.
- **Frequency payloads** must contain exactly the fields their unit allows, or the server returns 400. Always build
  them with `buildFrequencyPayload`. CUSTOM is not offered (the server rejects it).
- Send `null` (not omitted, not `''`) for empty optional fields the backend models as nullable (`endDate`,
  `categoryId`, `targetAccountId`, credit-card billing fields on non-card accounts).
- A transfer has two forecast events, one per account. Show only the event whose `accountId` matches the account
  being viewed. A credit card's balance is debt: `CREDIT` raises what's owed.

### Roles and permissions
- Per account: `OWNER` > `EDITOR` > `VIEWER` (`account.myRole`). Use `hasRole(myRole, 'EDITOR')`; don't compare
  strings ad hoc. Hide or disable what the user can't do, and give viewers a read-only page rather than a broken form.
  The server enforces the same rules (403), so the UI is a convenience, not security.
- Only the owner renames, deletes and shares. Editors change the balance, billing fields and planned
  transactions. Members can leave (`DELETE /accounts/{id}/shares/{myUserId}`).
- Categories are private per user. On shared accounts, read a transaction's category from its embedded `category`,
  not from your own `/categories` list.

### Errors and UX
- The server's error `message` is written to be shown to users. Use `apiErrorMessage(err, fallback)` for alerts;
  for forms, use `applyServerErrors(form, err, fallback, aliases?)`, which puts `fields[]` messages under the matching
  controls, and show them with `serverError(control) ?? '<client message>'` in `.invalid-feedback`.
- Turn known conflicts into specific guidance (e.g. a 409 on deleting an account or category means "still used by
  planned transactions"; on deleting a user it means "still owns data, disable instead").
- Every list has loading, error and empty states. Saving buttons show a spinner and disable while in flight.
- Accessibility: every input has a `<label for>`, icon-only buttons have `aria-label`, and status is never shown by
  colour alone.

### Styling
- Bootstrap utility classes first; component `.css` only for what Bootstrap can't do. Use Bootstrap variables
  (`var(--bs-…)`, `bg-body-tertiary`), not hard-coded colours.
- Bootstrap CSS and JS are loaded from `angular.json` (`styles`/`scripts`); `src/styles.css` only imports the icons.
  Modals and dropdowns use `data-bs-toggle`; the navbar collapse is signal-driven so it closes on navigation.
- Keep the layout usable at phone width.

### Charts
- Chart.js 4 (`components/forecast-chart/`). Register only the controllers, elements and plugins a chart uses
  (`Chart.register(...)`), so the rest is tree-shaken. Charts live in lazy routes; keep them out of the initial
  bundle.
- Colours come from CSS custom properties in the component's `.css` (`--chart-*`, with dark-mode values), read
  once with `getComputedStyle`. Check any new series colour against both surfaces with a palette validator.
- One series means no legend. Use thin lines, a hairline grid, a stronger line at $0, and a tooltip on hover.
  Don't put a number on every point.
- `animation: false`. Update an existing chart in place with `update('none')` rather than recreating it.
  `destroy()` it in `DestroyRef`.
- The canvas has `role="img"` and an `aria-label` summary, and a table always shows the same data.
- Skip drawing when `getContext('2d')` is null (jsdom), and test the data shaping (`forecast-series.ts`) as pure
  functions.

## Coding Conventions
- Prettier (`.prettierrc`): 100-char lines, single quotes, 2-space indent, LF line endings (`.gitattributes`,
  `.editorconfig`). `src/` is fully formatted; keep it that way with `npm run format`.
- File names `kebab-case.component.ts`; classes `PascalCase` with a `Component`/`Service`/`Pipe` suffix; constants
  `UPPER_SNAKE_CASE`.
- User-facing text is sentence case and plain ("Add new account", "Can't be before the start date").
- Comment *why* (a rule from the backend, a pitfall), not *what*. Doc comments on service methods state the required
  role and notable error statuses.

## Testing
- Vitest with globals (`describe`, `it`, `expect`, `vi`). Specs sit next to the code (`*.spec.ts`).
- HTTP: `provideHttpClient()` + `provideHttpClientTesting()`, `HttpTestingController.expectOne(...)` and `verify()` in
  `afterEach`. Add `withInterceptors([authInterceptor])` only when testing the interceptor.
- Routing: `provideRouter([])`, plus a stub `ActivatedRoute`
  (`{ snapshot: { paramMap: convertToParamMap({...}), queryParamMap: ... } }`), and
  `vi.spyOn(router, 'navigate').mockResolvedValue(true)`.
- Build data with `testing/api-fixtures.ts` (`account()`, `category()`, `planned()`, `validationError()`) and
  `testing/auth-fixtures.ts` (`tokens()`, `TEST_USER`). Code behind the refresh lock resolves asynchronously, so
  `await flushMicrotasks()` before expecting the request.
- **Assert exact request bodies** for anything that saves. The backend rejects extra or missing fields, so payload
  shape is the most valuable thing to test.

### Checking against the real backend (optional, for contract changes)
Unit tests only prove the payloads match what we *think* the server wants. To check against real code, start a
**separate throwaway instance**. Never write test data to the instance on :8080, which may be the user's Postgres.
1. `cd ../finances-service`, then `./mvnw -q -o dependency:build-classpath -Dmdep.outputFile=<tmp>/cp.txt
   -Dmdep.includeScope=runtime`.
2. Run `java -cp "target/classes;$(cat <tmp>/cp.txt)" com.narvalo.financesservice.FinancesServiceApplication
   --server.port=8081` with `SPRING_PROFILES_ACTIVE=local` (in-memory H2) and throwaway `APP_ADMIN_EMAIL`,
   `APP_ADMIN_PASSWORD` and `APP_JWT_SECRET`. Check that `target/classes` is newer than `src/main` first.
3. Replay the payloads with a Node script (`fetch`), then stop the instance.

### Checking in a browser (for visual changes)
Run a second dev server (`npx ng serve --port 4201`) and the throwaway backend from above, with
`APP_CORS_ALLOWED_ORIGINS=http://localhost:4201`. Seed it over the API, then drive headless Edge
(`msedge --headless=new --remote-debugging-port=9333`) from a Node script over the DevTools protocol.
- Rewrite `http://localhost:8080` to `:8081` inside that browser only, with
  `Page.addScriptToEvaluateOnNewDocument` wrapping `XMLHttpRequest.prototype.open`.
- Sign in through the login form, then take screenshots at 1280px and 390px wide.
- Record console errors and failed requests too.

Stop all three processes afterwards. Never touch the user's :4200 or :8080.

## Environment
- Windows 11; Git Bash and PowerShell are both available. **Python and jq are not installed**: use Node, sed or
  PowerShell for scripting.
- `git config core.autocrlf` is `true` locally; `.gitattributes` forces LF, so ignore any leftover CRLF warnings.

## Known Gaps
- Only the dashboard, forecast, categories, account form and planned-transaction form have been checked in a
  browser by an agent. The other screens are covered by unit tests and API contract checks only.
- Backend: `targetAccountId` has no foreign key, so deleting a transfer's target account leaves transfers pointing
  at it. The planned-transaction list shows "an account you can't see" for ids it doesn't know.
- The dashboard's budget cards don't refresh after an account is deleted from the embedded account list (each
  widget loads its own data).
