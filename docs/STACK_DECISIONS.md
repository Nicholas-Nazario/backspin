# Stack decisions

## Accepted: SQLite initially

Use SQLite on a persistent Fly Volume for the initial application. Its low infrastructure cost and suitability for a read-heavy collection/listening app make it a good starting point. Keep a straightforward relational schema so a future Postgres migration remains manageable.

Start with a single application Machine and accept occasional downtime during deployments or recovery. Do not add independent app replicas that write to separate database copies. Configure short transactions, foreign-key enforcement, WAL mode, and appropriate busy handling during implementation. Provide database-aware off-machine backups and test restoration; volume snapshots alone are insufficient.

Persist app-owned tags, sets, and listening history. Apply separately defined retention/freshness policies to cached Discogs content. Do not persist user OAuth credentials in SQLite; the proposed browser-held encrypted session approach still needs implementation review.

Revisit Postgres when availability requirements, multiple application servers, or measured write contention justify its additional cost.

## Cost clarification

The objective is minimal operating cost, not a guaranteed free tier. Fly's published pricing checked November 16, 2026 states no general free tier for new organizations, with personal-organization bills below $5/month waived. Eligibility and total organization spend matter. A 1GB application Machine was listed at $6.70/month in the lowest-priced regions, exceeding that threshold before storage. A 512MB Machine was listed at $3.69/month and a 1GB volume at $0.15/month, but memory suitability and total charges must be measured before assuming a waiver.

Source: https://fly.io/docs/about/pricing/

Subsequent implementation is authorized through Stage 2 and its engineering cleanup. Infrastructure provisioning and public deployment remain separate.
