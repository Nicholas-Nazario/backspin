# Phase 1 check-in

Implemented: Next.js/TypeScript foundation, SQLite migration and WAL configuration, encrypted browser-held OAuth sessions, expiring one-time callback records, same-origin connection/disconnect POSTs, collection pagination, on-demand release metadata, direct artwork loading/fallback, bounded account-scoped memory caching, serialized upstream calls and rate-limit backoff, local logout, Docker/Fly templates, setup and backup/restore documentation.

Verified locally: production compilation, TypeScript, four security/data/client tests, production HTTP health and landing page, unauthorized collection request (401), invalid callback recovery (303 with an HTTPS production APP_URL). Production authentication routes reject an HTTP APP_URL; use npm run dev for local OAuth. Backup tests restore committed data into a second database. No user credentials are stored in SQLite.

Pending: real OAuth approval/cancellation, private collection behavior, verified import counts/duplicates, observed rate headers, browser-origin image loading, long sessions, production Docker build, Fly deployment/memory sizing, and automated off-machine backup operations. Docker could not be built because the local daemon was unavailable. No infrastructure was provisioned. Live OAuth cannot be completed without locally configured app credentials.

Memory: local production Next process used approximately 123 MiB RSS after basic HTTP requests; this is an idle smoke measurement, not a representative authenticated workload or Fly sizing result. Start with a 512MB target and measure actual runtime before choosing the deployed size.

Review before Stage 2. Configure Discogs app credentials using README.md to complete the live portion of this stage; do not share secrets in conversation.
