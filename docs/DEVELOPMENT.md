# Development and operations

Setup, verification, architecture, credential handling, and operational guidance for Backspin. For the product overview, see the [README](../README.md). Engineering conventions live in [AGENTS.md](../AGENTS.md).

The hosted app is available at [backspin.fly.dev](https://backspin.fly.dev). This guide covers local development and operations for the single-process Fly deployment.

## Run locally

Use Node 24 and npm. Run `npm ci`, copy `.env.example` to `.env.local`, then run `npm run dev`.

Register an application at https://www.discogs.com/settings/developers and put its consumer key/secret directly into `.env.local`. Set its callback to `http://localhost:3000/api/auth/callback`. Set `SESSION_KEY` to the output of `openssl rand -hex 32`. Never paste secrets into chat or commit them. `APP_URL` must match the browser origin. Visit http://localhost:3000 and connect.

`npm test`, `npm run typecheck`, and `npm run build` verify the foundation. No mocked collection is presented as a real connection. Check private collection access with your authorized account. Click a record title to fetch release genres/styles. Collection pages load progressively (50 instances per upstream request); the grid shows 60 cards initially with a show-more control. Collection snapshots reload after five hours or when you select **Refresh collection**.

## Spotify connection

See [Spotify setup](SPOTIFY.md) for app registration, exact redirect URLs, local loopback origins, credentials, provider limits, branding, and verification. Spotify is optional and its connection is separate from Discogs. Authorization credentials remain in separate encrypted, HttpOnly cookies; no Spotify account or token table is added. The current Spotify session expires with the access token and does not store a refresh token.

## Recommendation browser verification

Run `node --env-file=.env.local --import tsx tests/recommendation.browser.ts` against the local server. Set `BACKSPIN_TEST_URL` for an isolated production server. These fixture checks cover one-album picks, rerolls with retained filters, genre/era limits, synced years, mood fallback, quiet background refresh, collection timestamps, keyboard focus, reduced motion, mobile layout, and import error recovery. They intercept Discogs calls and do not establish live-account recommendation quality.

`lib/recommendation.ts` owns pure eligibility, work deduplication, mood weights, and explanations. `app/recommendation/use-recommendation.ts` owns selection IDs and the cancellable reveal timer; collection and year data stay owned by the existing hooks. Background refresh retains the current pick while requests finish, then resolves its ID against the replacement collection; a removed or ineligible album disappears. New picks pause during refresh. Failed loads clear the snapshot. The collection count shows the oldest page fetch time from the server cache, not the browser render time. Expired years remove era eligibility immediately. No listening history or recommendation metadata is persisted.

The previous set/room components and their unit tests remain for a later cleanup. Browser fixtures targeting the former home-page set builder are historical and no longer apply to the current route. The product direction below supersedes the old room milestones: mobile-first, one album, Genre/Mood/Era, and no visual listening room in the main flow.

Initial collection loading uses `app/recommendation/vinyl-button.tsx`: a standalone record spins with the Citrus logo on a blue label, then stops and reveals **Drop the needle** on the same button when every collection page finishes. There is no deck, tonearm, additional loading timer, or minimum import delay. After a tap, the disc accelerates for 1.5 seconds and rolls out of the viewport over 0.7 seconds; then the selected album fades in. CSS animation completion advances the initial spinning/rolling/ready phases, so there is no duplicate JS duration or timeout for the roll-away. **Try another** keeps the current result mounted: the shuffle fills the artwork frame while the artist/title/metadata text is replaced visually by warm shimmer skeletons and the controls retain their positions. Hidden text preserves its exact layout height and is removed from the accessibility tree during the shuffle; reduced motion keeps skeletons still. The hook owns the current and pending selection IDs and one cancellable 2.2-second shuffle timer; it commits the pending ID only when the shuffle completes. Missing pending records cancel the shuffle without discarding a still-valid current album. The stage clips horizontal motion at the viewport edge without introducing sideways scrolling. Filter changes, missing data, and unmount discard the selection and its animation. Reduced motion uses a still loading record and skips straight to the result, including when that preference changes during the animation. Routine background refresh does not replay loading. The browser fixture holds the initial response and checks loading rotation, stable bounds, reduced motion, and animation handoffs.

## Mobile verification

Run `node --env-file=.env.local --import tsx tests/mobile.browser.ts` for Chromium touch emulation, and add `MOBILE_BROWSER=webkit` for Safari-engine coverage (`npx playwright install webkit` installs the test browser). `BACKSPIN_TEST_URL` can target an isolated production server. The fixture covers 320, 360, 375, 390, and 430px portrait widths plus short landscape, all approved taglines, long artist/album names, uncropped artwork, touch selection, sheet scrolling, rerolls, and settings. It checks document overflow and individual element bounds, with the primary action visible on portrait phones. These are browser-engine simulations, not physical iPhone or Android verification.

The viewport allows user zoom and uses safe-area insets. Mobile inputs use 16px text to avoid iOS focus zoom. The player and artwork scale to the available width and short portrait height; the sheet uses the dynamic viewport height and scrolls independently. Layout containers explicitly allow shrinking instead of hiding horizontal overflow.

If Chrome Device Mode shows a clipped page while fixture bounds pass, check `window.visualViewport.scale` in its Console. At 125% pinch zoom, a 375px layout has only a 300px visual viewport; the header, heading, and player appear cut off together. That zoom can survive a reload. Selecting another device and then returning to the desired device resets emulated pinch zoom. Keep real user pinch zoom enabled. Mobile fixtures assert that layout and visual viewports match before checking element bounds.

## Credential handling

Discogs handles passwords. OAuth access credentials live in an AES-256-GCM encrypted, authenticated browser cookie, HttpOnly, SameSite=Lax, Secure in production, with an eight-hour absolute expiry. Only transient request processing and bounded in-memory cache keys use them server-side. SQLite stores expiring one-time OAuth attempt IDs, not tokens. Callback values and cookies must never be logged by hosting/proxy tooling; the application sends same-origin referrer headers and no-referrer on the OAuth callback. Configure any observability to redact query strings and cookies. Logout clears local cookies/cache, not Discogs authorization. A copied cookie can remain valid until expiry: immediate session revocation is not implemented. Rotate the encryption key to invalidate all sessions.

The single-process scheduler spaces upstream calls and honors observed rate-limit exhaustion/429s. It does not retry indefinitely or bypass limits. Discogs cache entries are fresh for six hours. Collection pages, folders, and identity share an account-scoped memory cache keyed by connection and API path. Edition details and catalog matches have separate shared memory caches keyed by release ID and search query, respectively, and hold only the fields used by Backspin. Each memory cache has its own 100-entry capacity. This design is for one application process; multiple Machines need a coordinated limiter/cache architecture. Large imports are deliberately paginated, not automatically expanded into thousands of detail requests.

## Original-year cache and code organization

Original years are read from the monthly Discogs master index when it is installed. A master absent from the index can use the shared SQLite `master_years` cache or a live Discogs lookup. Live results expire after six hours, including live responses with an unknown year. Failed requests are uncached. The refresh icon rechecks live years; snapshot rows are refreshed when the collection reloads. The shared year data contains no collection membership, artwork, credentials, or user identifiers. The legacy `original_years` table remains in migration history.

`app/collection.tsx` composes focused components and hooks under `app/collection/`. Pure filtering/year rules live in `lib/collection.ts`; SQL lives in focused data modules with ordered migrations. Global CSS covers base elements; page and collection CSS Modules scope feature styles. No inline CSS is authored for application controls, including the native progress indicator. Provider brand assets remain unmodified. `npm run format` and `npm run format:check` maintain readable formatting.

Run browser fixtures against the dev server with `node --env-file=.env.local --import tsx tests/explorer.browser.ts` and `node --env-file=.env.local --import tsx tests/year-recovery.browser.ts`. They isolate account data and intercept Discogs calls. Cache persistence and expiry are also covered by `npm test`.

## Listening-room verification

The 4B listening room is a same-route native dialog owned by the existing mix component; entering/leaving does not remount the mix or collection hooks. `ListeningActions` shares navigation/stop semantics with the now-playing strip. The room reads current entries and original-year rules directly, shows a neutral fallback for missing/failed images, and hides collection artwork/metadata during refresh/error states while preserving the selected ID. Expired snapshots are not retained by a separate scene cache.

`app/listening/` contains the room, dialog content and CSS Module. `public/listening-room/` retains editable original vector source, passive scene assets, their MIT notice and layer notes. Fredoka and Nunito Sans are self-hosted under SIL OFL 1.1; notices and source hashes are retained in `public/fonts/`. No external font request is made. The standalone build and Docker image include public assets.

Run `node --env-file=.env.local --import tsx tests/listening-room.browser.ts` against the local server, using the same session key as the server. Like the existing browser fixtures, it uses a fabricated isolated account and intercepts Discogs requests. It covers mix/order/pin continuity, navigation boundaries, nested-dialog Escape/focus, uncropped artwork shapes and failures, original year, mobile/TV layouts, expiry with success/failure/retry, removed records, stop and reload. Screenshots are saved under `/tmp/backspin-room-*.png`. Fixture checks do not verify a real Discogs account, cover resolution/licensing, or room-distance TV readability.

The user reviewed the static room in the local app and approved 4B on November 16, 2026. This is visual acceptance, separate from the automated fixture checks. 4C now adds optional ambient motion and the shelf-swap transition to that daytime composition. The user approved 4C on November 20, 2026. The requested 4D increment adds a next-record preview and automatic/manual lighting; fullscreen and idle/reveal controls remain unimplemented. The 4B visual checkpoint is approved. 4C visual motion is approved; sustained-session comfort and TV-distance viewing remain pending checks. No infrastructure has been provisioned or deployed.

### Motion ownership and verification

`lib/room-motion.ts` is a pure ID/phase reducer. `use-room-motion.ts` owns media/visibility listeners and one timeout for the active swap phase, cleaned up on interruption and unmount. It never caches collection metadata. The existing listening hook remains the selection owner; the room temporarily presents the outgoing ID until the incoming record reaches the player, then switches identity once. A second navigation request during a swap settles on the latest selection. Expiry/missing data clears old artwork immediately. Pausing, reduced motion, compact layout or hiding the tab cancels choreography and settles on the selected ID.

`room-motion.module.css` owns phase durations, the eighteen-second circular vinyl rotation and a nine-second ±0.6° leaf sway. The hook reads the CSS duration once per phase, handling both `ms` and optimizer-normalized `s`. There are no per-frame React updates, repeat JS animation timers or new upstream requests. Tonearm rotation is performed in its unprojected plane, then flattened back into the player perspective. The two decorative shelf slots alternate without recording personal collection membership or listening history. Manual motion preference survives room entry/exit within this page; it is not persisted across reload.

`scripts/prepare-room-art.py` regenerates passive scene bases and `room-parts.tsx` from the approved editable SVG. It is a manual asset-preparation tool using Python's standard library, not an app/build dependency. Run Prettier on the generated TSX after regeneration. Mobile retains the animated record but simplifies record changes to a fade. Reduced motion always disables scene animation. Steam was omitted to keep the room calm.

The room typography is scoped against collection-page heading rules. Dense identity blocks use the open space above the jacket, clamp long titles to two/three lines according to available scene width, and keep genre labels on one row; full text stays available in details. Fixture bounds checks include an unusually long artist/title pair at 720p–4K.

The room browser fixture also covers full transition order and one-time identity commit, actual CSS rotation, manual pause/return, rapid navigation, visibility-event simulation, changing reduced-motion preference, compact changes, refresh during a swap and stop cleanup. `BACKSPIN_TEST_URL` optionally points this fixture at an isolated production server; existing fixture callers default to localhost:3000. Visibility simulation validates event handling, not operating-system tab throttling. Accelerated clocks do not establish thirty minutes of real viewing comfort.

### Bottom-bar preview and lighting

`room-controls.tsx` owns the visible control bar. The small next-record preview derives directly from `listening.next`, including navigation boundaries, reordering and outside-mix semantics; it has no separate queue/cache state. The caller clears it while collection data is loading or failed. It loads only the eligible next cover and uses the existing uncropped cover/failure treatment.

`lib/room-lighting.ts` owns device-local cutoffs: dawn 05:00–08:00, day 08:00–17:00, dusk 17:00–20:00, night 20:00–05:00. `use-room-lighting.ts` checks Automatic at minute boundaries and on focus/visibility restoration. It stops its one timer while hidden, unsubscribes in manual mode, and cleans up on exit. No geolocation, weather service, dependency or persistent setting is introduced. The preference belongs to the existing mix owner, so manual selection survives room entry/exit within the page and resets to Automatic after reload.

`prepare-room-art.py` generates four passive scene/player palettes from the same original source; moving leaves/sleeves and HTML text/controls use matching scoped CSS variables. Album images are not recolored or filtered. Lighting changes update assets/attributes without remounting the motion workflow or resetting the mix. Controls remain visible; fullscreen and idle/reveal work are outside this requested increment.

Run `node --env-file=.env.local --import tsx tests/room-display.browser.ts` against the local server (or set `BACKSPIN_TEST_URL` for an isolated production fixture). It checks manual palettes, automatic cutoffs and midnight, manual preference persistence, clock resume after hidden state, cover preservation, next-record order/boundaries/outside-mix state, expired/error preview removal and retry, responsive layouts, selector contrast, and lighting changes during swaps. Screenshots are written to `/tmp/backspin-room-{dawn,day,dusk,night}.png`. These are isolated fixture checks, not verified live-account or real-TV behavior.

## SQLite and backups

The default file is `data/mystery.sqlite`; never place it on Fly's ephemeral root filesystem in production. Set `DATABASE_PATH=/data/mystery.sqlite` and mount the volume. Migrations run idempotently on database initialization.

For a consistent local backup: `mkdir -p backups` then `npm run backup -- backups/mystery.sqlite`. Supply DATABASE_PATH in the shell if backing up a different file; the script does not load `.env.local`. Copy backups to a separate host/storage location with access controls and an explicit retention policy. SQLite's backup API includes committed WAL changes. Do not copy a live database file by itself.

To restore: stop the app, preserve the existing database/WAL/SHM together for rollback, remove the old database/WAL/SHM from the destination, place the backup at DATABASE_PATH, check ownership, run SQLite `PRAGMA integrity_check`, then restart and verify expected data. Never restore over an active process. Automated off-machine backup scheduling is not yet configured; it is a production prerequisite. Tests exercise backup/restore consistency.

## Fly deployment preparation

Dockerfile builds a standalone Next server running as the node user. `fly.toml` configures the `backspin` app in `ewr`, with HTTPS APP_URL `https://backspin.fly.dev`, a persistent volume mounted at `/data`, and a 512MB Machine. Set consumer credentials and SESSION_KEY via Fly Secrets. Keep the mounted directory writable by the node user. Use exactly one Machine; separate volume copies do not share data. Do not run database migrations in a Fly release command because the volume is not mounted there. Validate memory requirements under actual collection loads. The production image intentionally excludes TypeScript tooling; run backups with an appropriate operational tool/container using SQLite's backup API and arrange off-machine transfer before public use.

## Remaining live checks

The user verified live OAuth connection, collection preview, artwork, pagination, and release metadata in the local app. Explicit private-account coverage, cancellation/revocation, observed rate headers, long sessions, Docker/Fly operation, and artwork licensing remain separate checks. Automated fixtures do not establish those live behaviors.

## Discogs masters snapshot

Backspin reads the optional `discogs-masters.sqlite` file next to `DATABASE_PATH`. Set `DISCOGS_MASTER_INDEX_PATH` to use another location. The catalog keeps IDs, original years, titles, artist names, genres, styles, and representative release IDs. Collection membership, edition tags, and artwork still come from the collection API. The app fetches edition details when the user opens a record.

A snapshot row with an unknown year counts as checked. A master absent from the snapshot can use the existing live cache and live lookup. Explore uses a unique normalized artist-and-title match from the snapshot. An ambiguous local match is skipped. An absent match can use live catalog search.

Use the [Discogs data index](https://data.discogs.com/) to download the masters archive and its matching checksum list. Verify the SHA-256 checksum, then run this command with the archive date and path. The destination directory needs to exist. The importer streams the archive, checks SQLite integrity, and installs the new file by rename.

```sh
mkdir -p data
npm run import:discogs-masters -- 20261101 /path/to/discogs_20261101_masters.xml.gz
```

The **Refresh Discogs masters** workflow runs on the fifth of each month and also supports manual runs. On the default branch, it publishes the validated index and its SHA-256 checksum as assets of a dated GitHub release, such as `discogs-masters-20261101`. The workflow skips an already published snapshot.

To deploy with a published snapshot, pass its date to Fly:

```sh
fly deploy --build-arg DISCOGS_MASTERS_SNAPSHOT=20261101
```

The Docker build downloads and verifies that dated asset, then includes the index at `/app/catalog/discogs-masters.sqlite`. Pin the date in the Fly build args when choosing a default for future deploys. A deployment without a snapshot date uses live lookups. Publishing the catalog and deploying the app are separate operations.
