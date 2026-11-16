# Stage 3: random sets check-in

Implemented a focused random set builder as the home page (`/`), with collection browsing at `/collection`. Shared navigation makes the set experience primary. The home page opens the builder immediately without an extra toggle and does not render the collection grid. Surprise me draws from the full collection. Genre, Style, and Era modes constrain eligible albums. Search, filtering, sorting, and grouping remain on `/collection`. Navigating between pages clears temporary mix state by design; mixes are ephemeral, not playlists. Choose any positive album count using a number input or the slider from the whole collection, not just visible cards. Three-level artist, genre, and original-era variety sliders (Not much / Some / A lot) influence selection without excluding otherwise eligible albums. All preferences start at Some for a gentle variety bias; Not much leaves that dimension to chance. Some applies a gentle novelty bias; A lot strongly favors new values when available.

The generator samples unique masters (release IDs when no master exists), so extra owned editions do not increase an album's selection chance. It chooses an owned copy per album and returns fewer entries when the pool is small. It does not guess that different releases without a shared master are the same work. Artist variety excludes the Various compilation marker; genre variety uses supplied genre metadata; era variety uses known original decades or personal corrections, never pressing dates. Unknown metadata receives no variety bonus. Preferences can compete and do not guarantee distinct artists, genres, or eras.

The builder has an illustrated sleeve-shuffle reveal (1.5 seconds), followed by a staggered list reveal. Reduced-motion mode skips the animations and delay. Changing settings/filters, closing the panel, collection refresh, or unmount cancels pending reveal work.

Selection logic is pure and seeded for reproducible verification. Seeds are generated in the browser for each shuffle. Generated sets retain only instance IDs in memory and derive their visible metadata from the current collection, so collection refresh/expiry does not preserve stale record snapshots. Changing options leaves the current set intact and asks the user to shuffle again to apply the new choices. Mixes support swapping, drag reordering, removing, and pinning. Reshuffle holds pinned slots when possible and biases remaining picks against repeated metadata in the pinned context. Shrinking a mix moves out-of-range pins into available slots and cannot discard pins; the requested count must cover them. Removing a record shortens the mix and clears its pin. Swaps exclude all works already in the mix (including the outgoing work), and are disabled for pins or exhausted collections. No persistence, listening tracking, or personal tags were added.

Reused collection artwork/details and extracted the existing toggle into a shared component for grouping and variety options. Styles are CSS Modules with no inline CSS.

Verification: 20 unit/security/persistence tests, TypeScript, production build, existing explorer/recovery browser checks, and a random-set browser fixture covering count, variety sliders, reveal cancellation, reduced motion, reshuffle, full-collection eligibility, sparse pools, record details, and mobile layout. Fixtures do not call Discogs. Browser coverage also verifies pinning, swap prevention, mouse, touch, and keyboard drag reordering (including moving a pin then reshuffling), Escape cancellation, swapping a free pick, and removal/count updates. Review the real collection before proceeding to listening controls.

Drag behavior uses a focused pointer/keyboard hook with preview order, drag styling, and live announcements. Pointer capture stays on the list so row movement cannot terminate touch drags. A cancelled gesture restores the prior order. Pins remain movable and preserve their new positions on reshuffle. No inline styles or drag library were added.

Mix presentation is a cover-led grid (three desktop columns, two on tablet, one on narrow screens) with genre tags. Drag collision detection uses both axes; keyboard Left/Right follows sequence and Up/Down moves to the nearest card in an adjacent visual row. Browser coverage verifies large square artwork, tags, horizontal dragging, cross-row dragging, and touch reordering.

## Stage 3 completion and deferred scope

- Targeted genre/style and original-era modes are now implemented; they are no longer remaining work.
- Manual listening controls are implemented. Listening history is explicitly deferred, with no logging or persistence.
- Personal mood/context tags, energy ratings, and associated mix generation are deferred. Revisit with a suitable licensed data source or a clear need; no tagging maintenance workflow is required. Stage 3 is complete under this revised scope.

Saving remains intentionally out of scope. Ambient visuals remain Stage 4.

## Targeted modes check-in

Genre, Style, and Era selectors establish eligibility before random generation. Labels come from owned metadata, eras are original decades from master years or personal corrections, and unknown dates never substitute pressing dates. Era mode offers the existing lookup/status control. No generic collection search is reintroduced on the mix page.

Mode/settings changes leave the current mix intact until generated. Swaps continue to use that mix’s committed mode, and reshuffles apply the new selection. Pins outside the new mode block generation and require explicit release; compatible pins retain slots where possible. Empty pools disable generation, sparse pools return fewer albums, and exhausted pools disable swapping.

Verified with domain tests and a browser fixture for Pop-only and style-only selection, original decades, sparse pools, incompatible pins, committed-mode swaps, repeated shuffle, and mobile layout. No persistence or listening controls added.

## Manual listening controls check-in

Mix cards now have a manual now-playing action and current-record highlighting. A compact cover/artist/title bar provides previous/next and stop. Navigation derives from the live edited mix order, has no wraparound, and disables itself if the current album is outside the mix. Swapping/removing/shuffling does not pretend to change the physical record; the current record remains selected until the user changes or clears it. Missing collection data is hidden during refresh, and unavailable records have a clear stop path.

Nothing plays audio, detects turntable activity, logs plays, or persists listening state. History was explicitly removed from scope before implementation; no history API or schema was created. Reload/navigation clears the current selection.

Verification includes 25 domain/security/persistence tests plus listening/browser regressions for explicit selection, previous/next boundaries, reordered navigation, swap/remove continuity, stop, reload, mobile layout, and no history requests. Manual listening and history concerns are separated; personal tags are deferred rather than a prerequisite for Stage 4.
