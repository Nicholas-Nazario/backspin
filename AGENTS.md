# Engineering guidelines

## DRY and YAGNI

- Build the simplest solution that satisfies the current agreed behavior. Do not add services, dependencies, configuration, concurrency optimizations, or extension points for hypothetical future scale.
- Reuse existing domain logic, types, validation, and UI patterns before adding alternatives. Extract a shared implementation when actual callers share the same rule or behavior; similar-looking code alone is not sufficient.
- Keep one source of truth for business rules, cache freshness, and data ownership. Derive values instead of maintaining redundant state that must be synchronized.
- Prefer small functions and composition. Avoid generic frameworks, base classes, universal repositories, or speculative design systems. A single-purpose module can be worthwhile even with one caller when it isolates a substantial responsibility.
- Choose abstractions for present requirements. In particular, use a shared SQLite master-year cache when implemented; do not add simultaneous-request deduplication or distributed coordination without demonstrated need.

## Module boundaries

- Keep Next.js pages/layouts focused on composition and route handlers focused on authentication, input validation, invoking application logic, and HTTP responses.
- Separate rendering from substantial fetching, pagination, cancellation, retry, and cache lifecycle logic. Give those workflows focused hooks or service functions with explicit ownership of cleanup and state transitions.
- Split feature components by meaningful responsibility, such as filters, record cards, record details, and lookup status. Keep related code near its feature; promote code to shared modules when it is genuinely shared. Do not create a file for every trivial helper.
- Keep pure collection filtering, grouping, and original-year rules independent of React, HTTP, and persistence. Use explicit domain types at these boundaries.
- Keep SQL and database access in focused server-side data modules. Keep migration/setup code separate from growing feature queries. UI components must not import persistence, secrets, or server-only clients.
- Keep Discogs signing/transport separate from feature-specific metadata resolution and persistence. Share catalog metadata only where allowed; keep collection membership and personal corrections scoped to the authenticated user.
- Avoid catch-all files and miscellaneous utility buckets. Split a module when it mixes responsibilities or becomes hard to reason about, not merely when it reaches an arbitrary line count.

## Readability and UI

- Write normally formatted, readable TypeScript and JSX. Do not compress components, handlers, tests, or CSS into long single lines. Use descriptive names and comments explaining non-obvious decisions.
- Do not use inline CSS: no React `style` props, HTML style attributes, or embedded style blocks. Use CSS classes and component CSS Modules. For dynamic values, prefer semantic elements such as native progress indicators or state/attribute-driven classes; do not introduce inline styles as an exception.
- Maintain CSS rules at their source rather than repeatedly appending overrides. Keep global styles for actual global concerns; use feature/component styles for local behavior as the UI grows. Reuse established colors, spacing, and Phosphor conventions.
- Give asynchronous workflows explicit idle, loading, partial/error, paused, and completed states where relevant. Make cancellation and retries observable, preserve valid progress, and avoid duplicate timers or overlapping state owners.
- Keep product language about the user's task; leave technical implementation details in documentation unless they help the user make a decision.

## Changes and verification

- Refactor in small, behavior-preserving steps before extending an overcrowded module. Avoid unrelated rewrites and do not build an abstraction merely to satisfy this document.
- Test meaningful business rules and failure boundaries. Cover cache expiry, refresh/cancellation recovery, personal-data isolation, and persistence when those behaviors change. Reuse small fixture helpers when browser tests actually duplicate setup.
- Run TypeScript and relevant tests for the changed behavior; run a production build for structural/dependency changes. Documentation-only edits do not require application tests. Distinguish fixture checks from verified live Discogs behavior.
- Never log or commit secrets, cookies, access tokens, or OAuth callback parameters. Keep test data isolated from real accounts and credentials out of persistent application data.
- Preserve the agreed stage check-ins. Do not provision or publish infrastructure unless requested. Keep current limitations and unfinished decisions explicit.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
