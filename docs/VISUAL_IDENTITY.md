# Visual identity: a living-room record cafe

Direction: colorful, gently cartoonish, warm, tactile, and alive. Think illustrated listening bar: spinning vinyl, plants, flowers, coffee, soft light, and a friendly hand-built turntable booth. This is a direction document, not a finished design system. The proposed listening-scene art direction and staged delivery are in [Phase 4 plan](PHASE_4_PLAN.md).

## Visual language

Cream backgrounds, dark espresso text, and confident coral, leafy green, marigold, and sky-blue accents. Rounded panels, chunky controls, playful line drawings, restrained paper textures, and occasional irregular shapes. Reserve a quieter dark evening theme for long listening sessions.

Use a characterful display face alongside a highly readable body face; select actual fonts and verify licenses during design. Color must never be the sole indicator of state.

## Artwork and hierarchy

The product has two complementary visual modes: a cover-art-led browser for exploring and choosing records, and a stylized now-playing scene for ambient viewing while listening. Both are core to the intended experience.

The now-playing scene presents the selected jacket as part of an illustrated listening setup: turntable, slowly spinning disc, plants or flowers, coffee, and warm surrounding shapes. Style the presentation around the cover while preserving the recognizable original artwork. Keep the scene spacious enough to read across a room, with discreet linked Discogs attribution.

Keep the album cover large, square, legible, and unaltered. Illustrate the surrounding listening environment rather than repainting or decorating the cover itself. The vinyl disc can rotate beside or behind a static jacket so the artwork remains readable.

Now playing foregrounds cover, artist, album, original year when known, and a small selection of useful genre/style labels. Pressing details, credits, and longer context remain available on demand. Keep the next-record preview with active controls. Personal moods and sourced musical connections remain deferred.

## Motion and room display

Slow vinyl rotation, subtle plant movement, and gentle transitions provide ambient life. Motion follows the user's listening state, not a fabricated audio signal. No strobing or constant bouncing. Respect reduced-motion settings and provide pause-animation controls.

TV mode uses large text, generous spacing, subdued controls, and a small amount of information readable across a room. Artwork remains the hero. Avoid dense dashboards and long scrolling credits. Include fullscreen and a clear way to return to controls; do not promise prevention of screen burn-in.

## Tone

Inviting and curious: “Something sunny,” “Follow the producer,” “Dig a little deeper.” Avoid claiming certainty about mood or musical influence. Delight should support choosing and listening.

## Iconography

Use Phosphor Icons (`@phosphor-icons/react`) for interface icons. Regular weight is the default; bold emphasizes selected actions; duotone supports occasional warm decorative accents. Prefer 16–24px controls and consistent sizing within each context. Keep text labels where useful; decorative SVGs are aria-hidden and icon-only controls need accessible names. Use server-compatible imports in server components. Large listening-scene illustrations remain custom artwork.

Phosphor is MIT licensed, including commercial use and modification. Retain its copyright and license notice in THIRD_PARTY_NOTICES.md; no per-icon visible attribution is needed. Source: https://github.com/phosphor-icons/react
