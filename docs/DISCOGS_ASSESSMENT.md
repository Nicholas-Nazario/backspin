# Discogs investigation and proposed platform

Investigated November 16, 2026. This is a planning assessment, not a legal clearance or a live authenticated integration test.

## Evidence and verification limits

Primary sources:

- [Discogs API terms](https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use), last updated May 27, 2025.
- [Official developer documentation](https://www.discogs.com/developers).
- [Discogs-maintained client quickstart](https://github.com/discogs/discogs_client/blob/master/docs/quickstart.md).

The terms and official client documentation were accessible. The developer reference returned HTTP 403 to this research environment. Endpoint details and commonly documented numeric limits below are implementation planning assumptions requiring confirmation against the accessible reference and authenticated responses before coding against them. No account credentials were requested or used.

## Available API surfaces

Discogs API v2 provides database resources (releases, master releases/versions, artists, labels, search), user identity/profile, collection/folders/custom fields, wantlist, lists, and marketplace operations. Collection and catalog reads are the relevant core; marketplace functionality is unnecessary here. Some account endpoints also support writes, but the application should initially perform reads only.

Expected useful reads include /oauth/identity, /users/{username}/collection/folders, /users/{username}/collection/folders/0/releases, /releases/{id}, /masters/{id}, /artists/{id}, and /labels/{id}. Confirm field availability and private-collection behavior during a technical spike.

| Need | Discogs basis | Limit or additional work |
|---|---|---|
| Owned records | Collection entries and release IDs | Preserve collection instance IDs: users can own duplicates |
| Cover and identity | Release artwork, title, artist, format, label | Images have separate restrictions; missing images need fallback |
| Genre exploration | Genres and more detailed styles | Community taxonomy, multiple tags, uneven coverage |
| Era | Release year/date and master year | Reissue year is not original album year; master can be missing |
| Musical connections | Credits, artist IDs, aliases/groups, labels | Credits can be incomplete, track-specific, or inconsistent |
| Mood/energy/context | No dependable dedicated acoustic feature layer | Start with personal annotations; never equate genre with mood |
| Influence/sampling | Occasional notes or credits may provide clues | No comprehensive structured influence graph; require evidence |
| Runtime | Track durations when supplied | Missing durations and side boundaries make totals estimates |
| Listening history | App-owned events | Discogs collection ownership does not establish listening history |

The official client confirms an identifying User-Agent, paginated results, authenticated access to additional endpoints, and search by genre. Discogs is a metadata source, not an audio playback service.

## Authentication and request handling

Plan for OAuth 1.0a account authorization with a server-side callback and encrypted access credentials. A personal access token may suit a private technical spike but is a poor connection experience for general users. Never ask for a Discogs password. Application behavior should remain read-only even if authorization permits broader access; verify available permission controls rather than assuming granular read-only scopes.

Use owner authentication for private collection access; public visibility is not a substitute for account consent. Test actual private-account behavior before committing to support.

Commonly documented general limits are 60 authenticated and 25 unauthenticated requests per minute. These numbers were not independently confirmed from the official reference in this investigation. Do not assume every endpoint shares one limit or that collection calls are exempt. Read runtime rate-limit headers, handle 429s and server errors, queue background work, and back off. Identify the application with a meaningful User-Agent.

Import paginated collection summaries first, then fetch details only for selected records or active features. Avoid one detail request per album on every visit. Show progress and incomplete metadata explicitly. A 1,000-record collection requiring 1,000 detail calls would take at least roughly 17 minutes at 60/minute before overhead; pagination alone is much cheaper. Confirm maximum page size rather than hard-coding an assumption.

## Licensing and operational constraints

The terms distinguish CC0 catalog metadata from restricted collections/user data, images, and marketplace data. CC0 status does not erase restrictions attached to API access. Cover-image access does not independently establish unrestricted copyright permission.

Commercial use is conditional. The terms restrict charging for functionality accessing otherwise free Discogs content without written permission, prohibit commercial use and third-party transfer of restricted data, and restrict use intended to drive traffic to other services. A paid collection app should not be assumed permitted.

The terms also constrain retention and displaying information more than six hours older than Discogs. A conservative design refreshes data before that window expires and stops displaying expired upstream content when refresh fails. This is a design interpretation requiring clarification, not a claim that a six-hour cache alone guarantees compliance. Long-running TV sessions require refresh too.

Before public launch, obtain clarification on artwork in ambient displays, server/browser caching, processing by hosting vendors, private collection storage, derived indexes, and any commercial model. Do not build permanent artwork archives or send restricted data to third-party AI/enrichment services on the assumption that API access permits it. Keep the independent personal-annotation layer separate, but do not assume derived Discogs data escapes the terms.

## Proposed data and system boundaries

A browser application talks to an application backend, which handles OAuth, sessions, queued Discogs requests, freshness, and authorization. Keep secrets off the browser. Store minimal account identifiers and upstream data needed for the active service with explicit expiry, provenance, and deletion rules. Disconnect revokes local access and removes credentials and restricted cached content; expose deletion of app-owned data separately.

Distinguish collection instance, release/pressing, and master/work grouping. Store original-year and pressing-year separately with provenance. App-owned annotations contain mood labels, energy rating, context, favorites, and optional last-played events. Sets reference collection instances; connection edges carry type, evidence, source, and uncertainty. Missing metadata stays unknown, not zero or a guessed fact.

No vector database or generative model is needed for the initial product. Structured filters and an explainable scoring engine can deliver the core value with fewer dependencies.

## Set generation

Filter eligible owned items first, then rank and sequence them. Hard constraints include format, selected styles/era, exclusions, and length in albums. Preferences include novelty, personal energy, artist variety, and connection strength. Avoid duplicate works by default, with an option to include distinct editions. Use a seed for reproducible random selection.

| Tool | First implementation |
|---|---|
| Surprise me | Uniform random choice from eligible records |
| Genre/style journey | Selected tags, optional adjacent styles, clear explanations |
| Era session | Original-year range; explicit inclusion/exclusion of unknown years |
| High energy | User-rated eligible albums; disclose insufficient tags |
| Cozy cafe | Personal mood/context tags, not automatic genre stereotypes |
| Follow a thread | Shared credited producer, performer, or label |
| Energy arc | Sequence tagged albums from calm to energetic or back down |
| Neglected shelf | Least recently played in this app; separate never-logged from known history |

Start with 3–5 album sets. Album-count targets are reliable; time targets are estimates where durations exist. Explain each recommendation and transition, and allow manual correction. A sparse collection should yield a shorter honest set rather than invented matches.

For Kid Cudi → Kanye, shared collaborators or explicit credits can support a connection. “Inspired by” is a stronger directional historical claim: require a cited source and describe its scope. Shared genre or co-occurrence alone does not prove influence. Begin with curated, sourced connections and user-created links before broad enrichment.

## Delivery sequence and open decisions

1. Resolve terms questions and verify OAuth, private collection access, sample payloads, image delivery, pagination, and observed limits with a small authorized test account.
2. Build the collection explorer and manual now-playing display with genre/style and correctly labeled years.
3. Add annotations, editable sets, and local listening history.
4. Add shared-credit paths; evaluate separately licensed enrichment only when its value and permissions are clear.

Current proposed service: publicly available, free, no advertising or revenue, with each user connecting their own Discogs account. Album-first discovery and manual listening controls remain the starting scope. Era always refers to original release, not pressing date; unresolved original dates remain unknown or user-correctable with provenance.

## Public noncommercial service: follow-up assessment

The API terms explicitly license use of restricted data to create websites and applications. They do not state that every free public application needs advance written approval. Free, non-revenue operation avoids the obvious paid-access and commercial restricted-data conflicts. Account authorization supports access to each user's own collection, but does not waive Discogs' restrictions.

Important remaining obligations: necessary-only storage, freshness of displayed data, rate limits, privacy, image rights, required attribution, and no third-party transfer of restricted data. Public availability of the app should not mean public disclosure of connected users' collections. The broad third-party-transfer restriction leaves uncertainty about hosting processors, optional sharing, and enrichment providers; seek targeted clarification rather than assuming either blanket prohibition or blanket permission.

Section on intellectual property requires the application non-affiliation notice and a nearby “Data provided by Discogs.” attribution linked to the corresponding Discogs page, without nofollow. Include these in collection and now-playing designs. API access is revocable, can change, and may become paid even if our service remains free.

Conclusion: the proposed free public service is substantially better aligned with the terms than a paid app, and is not expressly prohibited merely because it is public. Clarification should focus on the actual unresolved uses: long-running artwork-centric displays, required caching, and handling by infrastructure vendors. This assessment is an interpretation of the published terms, not written approval from Discogs.
