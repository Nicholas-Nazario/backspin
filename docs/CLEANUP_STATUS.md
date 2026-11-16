# Engineering cleanup check-in

Completed the agreed cleanup before Stage 3:

- Collection parent now composes focused filters, cards, record details, and year-status components. Hooks own collection loading and master-year resolution, including expiry, cancellation, and recovery. Pure filtering and year precedence remain independent.
- Page and collection use scoped CSS Modules. Global CSS covers base controls and document defaults. Accumulated overrides have been consolidated, and the progress indicator is native HTML with no inline CSS. Code is formatted with Prettier; format/check commands are available.
- Ordered SQLite migration 3 adds a shared master-year cache. It stores only ID, year (including known-unknown), source, and freshness timestamps. Fresh rows are automatically restored in the browser, reused across users, and retained across restarts. The five-hour policy is centralized; expired rows are removed on reads and browser expiry removes displayed values. Force refresh bypasses the cache; personal corrections remain account-scoped and take precedence. No request deduplication was introduced.
- Progress labels explicitly count albums checked; completed coverage counts owned records. Releases without a master or a usable year remain unknown.

Verification: 11 unit/security/persistence tests; TypeScript; production build; browser fixtures covering browse/search/filter/group/details, mobile width, keyboard dismissal, no inline styles in application content, fresh-year restoration without new upstream calls, browser expiry, per-album failure/retry, forced refresh, and collection-refresh recovery. Reviewed a mobile fixture screenshot. An authenticated fixture HTTP smoke check verified the shared cache endpoint against the running app/database without Discogs access.

No infrastructure was deployed. User review of the real collection remains the final check-in before Stage 3. Existing lookup results from before this change were only in memory and cannot be recovered after a reload; run the lookup once to populate SQLite.
