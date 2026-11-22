# Visual identity: one good record

Direction: colorful, gently cartoonish, warm, tactile, and alive. Think illustrated listening bar: spinning vinyl, plants, flowers, coffee, soft light, and a friendly hand-built turntable booth. This is a direction document, not a finished design system.

## Visual language

The Backspin brand mark is a soft, curled six-petal bloom with orange, yellow, and peach petal pairs and a small color swirl around its center hole. Use the transparent SVG at `public/brand/citrus-bloom.svg` beside the title and on the loading vinyl’s cream label. The background, center hole, and curled cutouts stay transparent on any surface. Keep the existing record motion and reduced-motion behavior.

Cream backgrounds, dark espresso text, and confident coral, leafy green, marigold, and sky-blue accents. Rounded panels, chunky controls, playful line drawings, restrained paper textures, and occasional irregular shapes. Reserve a quieter dark evening theme for long listening sessions.

Use a characterful display face alongside a highly readable body face; select actual fonts and verify licenses during design. Color must never be the sole indicator of state.

## Current product direction — November 20, 2026

Tagline: **Less time choosing, more time listening.** A mobile-first home screen foregrounds **Drop the needle**, with a quiet **Narrow it down** action for Genre, Mood, and Era. Reveal one album with a brief, grounded explanation, then offer **Try another**. Avoid generic recommendation filler and repeated outbound record links. Album artwork remains unaltered, uncropped, and attributed to Discogs.

Use a standalone vinyl as the home-screen focus: spin while loading, reveal **Drop the needle** on the stopped label, and accelerate after a tap, then roll off-screen as the selected album fades in. Keep its position and size stable. Do not add a deck, tonearm, or extra CTA pop-over.

Keep the warm palette, rounded controls, self-hosted Fredoka and Nunito Sans, and Phosphor icons. The user specifically chose the existing shuffle-deck loading animation as the reference for further motion: gently offset sleeves, small lifts and rotations, and a sparkle. Carry that playful feel into the vinyl acceleration and roll-away, with a quiet fade for the album reveal. Respect reduced motion; the revealed album stays still. Do not add an ambient room or queues to this experience.

Genre and Era visibly constrain the pool. Mood is a softer preference and must not imply that tags establish an album’s actual emotional character. Spotify, listening history, and richer models are future exploration, not current capabilities.

## Historical room direction (superseded)

The remaining notes document the former implementation and approvals. They are not requirements for the current recommendation experience.

## Current listening-room direction

Phase 4A studies have settled on a listening nook with a full wooden window, a counter, and a built-in cabinet with tall LP storage beneath the turntable. The illustration uses gently irregular outlines, flat warm colors and shallow depth from the window reveals, wall returns, counter surface and overlapping objects. Flowers, a leafy plant and coffee provide restrained detail. The outside view uses sky and distant greenery.

The current 16:9 composition keeps a smaller upright jacket in proportion to the player and window, with a roomy artist/title area beside it. Dawn, day, dusk and night lighting affect the room while preserving album colors. Automatic lighting now uses device-local clock cutoffs: dawn 05:00–08:00, day 08:00–17:00, dusk 17:00–20:00, and night 20:00–05:00. The bottom bar offers Automatic and each manual state. The user chose these basic cutoffs; location and astronomical sunrise/sunset calculations are not required.

Record-change storyboards explore the arm moving clear, the old record returning to the cabinet shelf, and the next record coming out before the arm returns. The display jacket changes once with the new selection. The 4C implementation now follows this sequence in about 2.5 seconds on desktop, with an upright jacket and one identity change at record placement. Mobile uses a simpler fade. Rapid navigation settles on the latest choice. Motion remains cosmetic and preserves the existing manual listening semantics.

The user approved this 16:9 composition and record-change storyboard at the final 4A review on November 16, 2026. The static 4B implementation now uses that visual baseline with self-hosted Fredoka for identity and Nunito Sans for controls, both SIL OFL 1.1. Desktop/TV keeps the 16:9 room; portrait/mobile prioritizes the jacket, identity and simplified turntable. It preserves the mix on entry/return and provides visible listening controls, record details and artwork credits. The user approved the static 4B room in the local app. The user approved 4C rotation, subtle leaf movement and the shelf-swap sequence on November 20, 2026; reduced motion and manual pause retain a still scene. The requested 4D additions—next-record preview and automatic/manual lighting in the bottom bar—are implemented for review. Fullscreen and idle/reveal behavior remain planned separately. Sustained-session and TV-distance checks remain part of the long-session polish.

## Artwork and hierarchy

The product has two complementary visual modes: a cover-art-led browser for exploring and choosing records, and a stylized now-playing scene for ambient viewing while listening. Both are core to the intended experience.

The now-playing scene presents the selected jacket as part of an illustrated listening setup: turntable, slowly spinning disc, plants or flowers, coffee, and warm surrounding shapes. Style the presentation around the cover while preserving the recognizable original artwork. Keep the scene spacious enough to read across a room, with discreet linked Discogs attribution.

Keep album artwork prominent, legible, and unaltered, preserving the source image’s actual aspect ratio. Illustrate the surrounding listening environment rather than repainting or decorating the cover itself. The vinyl disc can rotate beside or behind a static jacket so the artwork remains readable.

Now playing foregrounds cover, artist, album, original year when known, and a small selection of useful genre/style labels. Pressing details, credits, and longer context remain available on demand. Keep the next-record preview with active controls. Personal moods and sourced musical connections remain deferred.

## Motion and room display

Slow vinyl rotation, subtle plant movement, and gentle transitions provide ambient life. Motion follows the user's listening state, not a fabricated audio signal. No strobing or constant bouncing. Respect reduced-motion settings and provide pause-animation controls.

TV mode uses large text, generous spacing, subdued controls, and a small amount of information readable across a room. Artwork remains the hero. Avoid dense dashboards and long scrolling credits. Include fullscreen and a clear way to return to controls; do not promise prevention of screen burn-in.

## Tone

Inviting and curious: “Something sunny,” “Follow the producer,” “Dig a little deeper.” Avoid claiming certainty about mood or musical influence. Delight should support choosing and listening.

## Iconography

Use Phosphor Icons (`@phosphor-icons/react`) for interface icons. Regular weight is the default; bold emphasizes selected actions; duotone supports occasional warm decorative accents. Prefer 16–24px controls and consistent sizing within each context. Keep text labels where useful; decorative SVGs are aria-hidden and icon-only controls need accessible names. Use server-compatible imports in server components. Large listening-scene illustrations remain custom artwork.

Phosphor is MIT licensed, including commercial use and modification. Retain its copyright and license notice in THIRD_PARTY_NOTICES.md; no per-icon visible attribution is needed. Source: https://github.com/phosphor-icons/react
