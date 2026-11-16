# Mystery DJ: direction and principles

Status: planning only. No application code implemented.

## Mission

Help people rediscover records they already own and turn choosing the next album into a pleasurable listening ritual. The product accompanies physical listening; it does not need to play audio.

## Core experience

Connect Discogs, explore your collection, choose an album or generate a short set, then enter a room-friendly now-playing view. Users explicitly mark what is playing and advance the queue. Do not imply automatic turntable detection or audio synchronization.

Three spaces: collection browsing; set building; now playing. Prioritize a usable collection and reliable selections before elaborate visualization.

## Principles

- Recommend owned records by default. Keep wishlists distinct.
- Explain selections: shared producer, selected style, user-tagged mood, or deliberate contrast.
- Distinguish documented facts, personal annotations, and suggestions.
- Treat mood as subjective and energy as variable across an album.
- Preserve exact pressing identity while grouping related editions for discovery.
- Era means the music's original release period. Use original release year for browsing, sets, and the main display. Pressing dates are optional secondary details and must never silently substitute for unknown original dates.
- Make every generated set editable. Support replace, reorder, pin, skip, and regenerate unpinned entries.
- Prefer album-scale listening over pretending this is a beatmatching tool.
- Keep private collections private. Do not send collection membership or artwork to enrichment/AI services without resolving permissions and user consent.
- Provide visible sync state and graceful handling of missing metadata, images, and upstream outages.

## Initial scope

1. Connect/disconnect Discogs; import collection progressively; browse and search; filter genre, style, era, artist, format, and folder.
2. Manual now-playing controls remain ephemeral. Personal mood/energy/context tagging and listening history are deferred.
3. Generate random, style/genre, and original-era mixes. Revisit mood/energy enrichment only when a suitable data source or clear need emerges.
4. Add evidence-backed connections through producers, performers, groups, and labels.

Defer streaming, marketplace features, public collection sharing, automated audio analysis, and unsourced influence graphs.

## Success criteria

Users can choose something they want to play quickly, discover overlooked records, understand each transition, and comfortably leave the display visible during an album. Measure selection acceptance, replacements, and voluntary feedback rather than maximizing browsing time.
