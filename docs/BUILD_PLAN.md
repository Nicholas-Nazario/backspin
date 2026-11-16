# Build plan

Work proceeds one stage at a time. At each stage boundary, report what works, verification results, limitations, and the concrete result to review. Check in with the user before starting the next stage. This plan does not authorize public deployment or contacting Discogs.

## Stage 1: Discogs integration and application foundation

Goal: prove the account and data flow before investing in the interface.

Deliverables:
- Scaffold TypeScript, Next.js/React, SQLite, and local development configuration.
- Establish database migrations, foreign keys, short transactions, WAL mode, and busy handling.
- Implement Discogs OAuth with a temporary handshake session bound to the initiating browser and callback verification.
- Validate encrypted, authenticated, HttpOnly/Secure cookie sessions. Keep user tokens out of the database, browser JavaScript, URLs, and logs. Store application secrets in local ignored configuration and eventually Fly Secrets.
- Retrieve verified identity, paginated collection entries, release details, and artwork. Test private collection access with an authorized account.
- Add bounded upstream caching, request scheduling, rate-limit handling, and explicit sync/failure states. Record observed endpoint limits rather than assuming them.
- Provide a minimal diagnostic collection screen and disconnect action. Distinguish local logout from revocation at Discogs.
- Prepare a Docker/Fly configuration using one Machine and one persistent SQLite volume; measure memory locally. Document off-machine backup and restore procedures. Actual provisioning requires an explicit deployment instruction.

Verification:
- OAuth success, cancellation, invalid/replayed callback, session expiry, and local logout.
- Confirm private/public collection behavior, duplicate collection instances, pagination, and empty collections.
- Verify browser image loading from the app origin, missing artwork, rate limiting, and upstream failures.
- Confirm tokens do not enter persistent data or logs; verify private responses are not publicly cached.
- Exercise a database backup and restore locally before real user data is entrusted to it.

Check-in: demonstrate account connection and a real collection sample; summarize API findings, session tradeoffs, measured memory, and any blockers. Ask the user to review before Stage 2.

Dependencies: a registered Discogs application and an account authorized for testing. The user supplies secrets through local configuration, not conversation. If unavailable, finish the scaffold and mock-assisted verification, but keep live integration explicitly incomplete.

## Stage 2: Collection explorer

Goal: make the owned collection pleasant and dependable to browse.

Deliverables:
- Responsive cover-led grid, search, sorting, and filters for genre/style, original era, artist, and format. Add folders if verified available.
- Record details showing artist, album, original year, genres/styles, and useful credits, with linked Discogs attribution.
- Preserve collection instances and release IDs while grouping editions where useful. Never silently use a pressing date as original year.
- Resolve original dates from available master/release evidence with provenance; unknown dates remain unknown. Provide a personal correction mechanism.
- Progressive loading, clear metadata completeness, cache freshness, and accessible keyboard navigation.
- Apply the documented colors, typography direction, and playful shapes without building the ambient scene yet.

Verification:
- Compare imported counts with Discogs; verify combinations of filters, duplicate ownership, missing masters/years, and sparse metadata.
- Check small and large screens, keyboard access, and readable loading/error states.
- Verify freshness expiry and refresh failures do not silently leave stale upstream content displayed.

Check-in: browse the actual collection together; review date accuracy, usefulness of filters, and initial visual direction before Stage 3.

## Stage 3: Sets and personal listening tools

Goal: reliably answer “what should I play next?”

Deliverables:
- First: random mixes from the whole collection, with flexible album counts and artist/genre/original-era variety preferences. Collection search/filtering stays separate from mix generation.
- Implemented: explicit genre, style, and original-era mix modes, such as Pop-only, Soul-Jazz, or 1970s original releases. Generation, swaps, and reshuffles honor the selected mode. Existing mixes retain their original mode for editing until a new mix is generated. Incompatible pins require explicit release. Sparse matches produce shorter mixes; unknown original dates are excluded from era modes.
- Reorder, replace, pin, remove, and regenerate unpinned entries. Mixes are intentionally ephemeral; no saving or playlist library.
- Explain each selection, avoid duplicate works by default, and handle insufficient matches honestly.
- Implemented: manual now-playing selection, next/previous, and stop. No audio playback or automatic turntable detection. Listening history and “mark played” are explicitly deferred; no logging or persistence.
- Keep recommendation and sequencing logic separate from UI so it can be meaningfully tested.
- Deferred: personal mood/context tags, energy ratings, and mood/energy mixes. Revisit when a suitable licensed data source or a demonstrated need justifies the effort. Stage 3 is complete under the revised scope.

Verification:
- Seeded random generation is reproducible; eligibility constraints and pins are respected.
- Sparse collections, insufficient metadata, exclusions, duplicate editions, and deleted/unavailable collection entries behave clearly.
- Mixes are not saved or shared; personal annotations remain isolated by user.
- Listening controls follow edited mix order and stop at boundaries. Swapping/removing the current record must not silently change what is on the turntable. Nothing records listening history.

Check-in: generate and edit real listening sessions; assess recommendation quality and tagging effort before Stage 4. Shared-credit journeys can follow as a scoped extension after the basic tools are useful; historical influence claims require sourced evidence.

## Stage 4: Ambient now-playing experience

Detailed art direction, milestones, and acceptance criteria: [Phase 4 plan](PHASE_4_PLAN.md). Work one milestone at a time with a review at each boundary.

Goal: make the app worth leaving open across the room during a record.

Deliverables:
- Large original cover within an illustrated cafe/turntable scene, with app-owned spinning vinyl, plants/flowers, coffee, and warm colors.
- Readable artist, album, original year, available genre/style labels, and next-record preview; discreet required linked attribution.
- Fullscreen, day/evening presentation, subdued controls, reduced motion, and pause-animation support.
- Responsive TV/monitor layout, long-session metadata refresh, image fallbacks, and clear session-expiry recovery.
- Profile resource use and avoid unnecessary network requests or animation work during steady viewing.

Verification:
- Review on a large display and smaller screens; assess distance readability and actual artwork quality.
- Exercise reduced motion, keyboard controls, fullscreen exit, and a long-running session including refresh/expiry behavior.
- Measure browser CPU/memory and application Machine memory under representative browsing and listening use.

Check-in: review the complete browse → choose set → now playing flow. Decide remaining polish and public-launch readiness.

## Public-launch readiness, after the four stages

Resolve artwork contract/copyright questions for the intended use; prepare privacy, deletion, and required attribution/non-affiliation text. Validate production secrets, backup restoration, database persistence, memory sizing, and upstream failure behavior. Review the deployment and expected bill with the user before publishing. Do not treat completion of local development as public-launch clearance.
