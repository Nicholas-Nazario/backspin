# Stage 2 check-in

Implemented full-collection progressive loading, search, genre/style/artist/format/folder filters, original-era filters, title/artist/year/recently-added sorting, optional edition grouping, accessible native record-details dialog, artwork fallback, selected credits, and account-scoped original-year corrections stored in SQLite migration 2.

The era model never falls back to pressing year. Users explicitly resolve unique Discogs masters, or supply personal corrections; provenance is shown in details. Resolution can be stopped, is incremental, and costs one request per uncached unique master. Missing masters remain unknown. Grouping preserves each collection instance and allows switching owned editions in details. Genre/style fields remain community metadata.

Filters cover progressively imported records, with counts and incomplete state displayed. Only 60 cards render initially, with show-more controls. A five-minute snapshot expiry clears imported data and reloads; partial imports also receive an expiry timer. Failed refreshes do not retain expired content. Release details expire separately and can be refreshed. No private collection is persisted in SQLite.

Verification: nine unit/security/data tests, TypeScript, production build, and Chromium fixture checks covering search, era resolution/filtering, grouping, details, Escape, and a 390px mobile viewport without horizontal overflow. Browser fixtures are intercepted and do not call Discogs or use actual account data. Real collection behavior and date quality need user review at localhost:3000. No deployment performed.

Run browser checks against the dev server with `node --env-file=.env.local --import tsx tests/explorer.browser.ts`. This uses the local session key to create a fixture-only cookie in an isolated browser; no secrets are printed. Normal tests: `npm test`.

Known scope limits: master year is the available original-year evidence, not a guarantee of historical correctness; use personal correction when needed. No bulk automatic inference for releases without masters. No ambient player or set tools in this stage. A large collection can take longer than the short snapshot window to import; the app reports expiry and supports retry rather than silently extending freshness.

Review: refresh the existing connected browser, compare loaded count with Discogs, try combined filters, resolve years, inspect a reissue, save/reset a personal year, and review the new details layout. Stage 3 starts after this check-in.
