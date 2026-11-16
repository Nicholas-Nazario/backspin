# Backspin

Dig your crates.

Stage 2: local collection explorer with search, filters, original-year lookup, and personal corrections. No infrastructure has been provisioned.

## Run locally

Use Node 24 and npm. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`.

Register an application at https://www.discogs.com/settings/developers and put its consumer key/secret directly into `.env.local`. Set its callback to `http://localhost:3000/api/auth/callback`. Set `SESSION_KEY` to the output of `openssl rand -hex 32`. Never paste secrets into chat or commit them. `APP_URL` must match the browser origin. Visit http://localhost:3000 and connect.

`npm test`, `npm run typecheck`, and `npm run build` verify the foundation. No mocked collection is presented as a real connection. Check private collection access with your authorized account. Click a record title to fetch release genres/styles. Collection pages load progressively (50 instances per upstream request); the grid shows 60 cards initially with a show-more control. Collection snapshots reload after five minutes.

## Credential handling

Discogs handles passwords. OAuth access credentials live in an AES-256-GCM encrypted, authenticated browser cookie, HttpOnly, SameSite=Lax, Secure in production, with an eight-hour absolute expiry. Only transient request processing and bounded in-memory cache keys use them server-side. SQLite stores expiring one-time OAuth attempt IDs, not tokens. Callback values and cookies must never be logged by hosting/proxy tooling; the application sends same-origin referrer headers and no-referrer on the OAuth callback. Configure any observability to redact query strings and cookies. Logout clears local cookies/cache, not Discogs authorization. A copied cookie can remain valid until expiry: immediate session revocation is not implemented. Rotate the encryption key to invalidate all sessions.

The single-process scheduler spaces upstream calls and honors observed rate-limit exhaustion/429s. It does not retry indefinitely or bypass limits. Collection and release cache entries expire after five minutes, are scoped by account token, capped at 100 entries, and are never served stale. This design is for one application process; multiple Machines need a coordinated limiter/cache architecture. Large imports are deliberately paginated, not automatically expanded into thousands of detail requests.

## Original-year cache and code organization

Original years are stored in a shared SQLite `master_years` table keyed by Discogs master ID, with source, fetched-at, and expiry timestamps. Fresh entries are restored automatically on collection load, including results originally fetched for another user. Only missing/expired masters require Discogs requests. The five-hour TTL (`MASTER_YEAR_TTL` in `lib/year-data.ts`) refreshes before the six-hour freshness boundary. Expired rows are removed when the cache is read and expired browser results are removed too. Missing years are cached as unknown; failed requests are not cached. The refresh icon bypasses the cache. No collection membership, artwork, credentials, or user identifiers are stored in this shared table. Personal corrections remain in `original_years`, scoped by user and release, and take precedence over shared years.

`app/collection.tsx` composes focused components and hooks under `app/collection/`. Pure filtering/year rules live in `lib/collection.ts`; SQL lives in focused data modules with ordered migrations. Global CSS covers base elements; page and collection CSS Modules scope feature styles. No inline CSS is used, including for the native progress indicator. `npm run format` and `npm run format:check` maintain readable formatting.

Run browser fixtures against the dev server with `node --env-file=.env.local --import tsx tests/explorer.browser.ts` and `node --env-file=.env.local --import tsx tests/year-recovery.browser.ts`. They isolate account data and intercept Discogs calls. Cache persistence/expiry and correction isolation are also covered by `npm test`.

## SQLite and backups

The default file is `data/mystery.sqlite`; never place it on Fly's ephemeral root filesystem in production. Set `DATABASE_PATH=/data/mystery.sqlite` and mount the volume. Migrations run idempotently on database initialization.

For a consistent local backup: `mkdir -p backups` then `npm run backup -- backups/mystery.sqlite`. Supply DATABASE_PATH in the shell if backing up a different file; the script does not load `.env.local`. Copy backups to a separate host/storage location with access controls and an explicit retention policy. SQLite's backup API includes committed WAL changes. Do not copy a live database file by itself.

To restore: stop the app, preserve the existing database/WAL/SHM together for rollback, remove the old database/WAL/SHM from the destination, place the backup at DATABASE_PATH, check ownership, run SQLite `PRAGMA integrity_check`, then restart and verify expected data. Never restore over an active process. Automated off-machine backup scheduling is not yet configured; it is a production prerequisite. Tests exercise backup/restore consistency.

## Fly preparation

Dockerfile builds a standalone Next server running as the node user. `fly.toml` is a template: set a unique app name and HTTPS APP_URL, provision one volume, ensure the mounted directory is writable by the node user, and set consumer credentials and SESSION_KEY via Fly Secrets. Use exactly one Machine; separate volume copies do not share data. Do not run database migrations in a Fly release command because the volume is not mounted there. Start with 512MB only as a measurement target. No deployment has been performed. The production image intentionally excludes TypeScript tooling; run backups with an appropriate operational tool/container using SQLite's backup API and arrange off-machine transfer before public use.

## Remaining live checks

The user verified live OAuth connection, collection preview, artwork, pagination, and release metadata in the local app. Explicit private-account coverage, cancellation/revocation, observed rate headers, long sessions, Docker/Fly operation, and artwork licensing remain separate checks. Automated fixtures do not establish those live behaviors.
