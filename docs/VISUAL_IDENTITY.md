# Visual identity: one good record

Direction: colorful, gently cartoonish, warm, tactile, and alive. Think illustrated listening bar: spinning vinyl, plants, flowers, coffee, soft light, and a friendly hand-built turntable booth. This is a direction document, not a finished design system.

## Visual language

The Backspin brand mark is a soft, curled six-petal bloom with orange, yellow, and peach petal pairs and a small color swirl around its center hole. Use the transparent SVG at `public/brand/citrus-bloom.svg` beside the title and on the vinyl’s soft sky-blue label, which keeps the same fill during loading, idle, hover, and playback transitions. The background, center hole, and curled cutouts stay transparent on any surface. Keep the existing record motion and reduced-motion behavior.

The core brand triad is Citrus yellow (`#FFCB00`), orange (`#FF6500`), and peach (`#FF9164`). Use it for the logo, shuffled record sleeves, and warm decorative highlights. Yellow and peach tints support notices and metadata without competing with album artwork.

Soft sky blue (`#A8D5F2`) is the UI accent: navigation, buttons, selected filters, and the vinyl label. Use deeper blue for links, focus indicators, progress, and text on blue controls so they stay readable. Cream backgrounds and dark espresso text ground the palette. Shared colors live in `app/style.css`; feature styles reference those variables. Keep the vinyl label the same blue through loading, idle, hover, and animation.

Use rounded panels, chunky controls, playful line drawings, restrained paper textures, and occasional irregular shapes.

## Interaction styles

The header groups Discover and Collection into one rounded navigation bar with Phosphor icons and a blue current-page fill. Center it on desktop and give it a full-width second row on mobile. The Backspin name and Citrus logo form one home link to Discover. Hovering the brand link slowly rotates only the logo, with no background fill. Leaving hover pauses at the current angle; hovering again resumes from there, and a fresh page load resets it. Reduced motion keeps the logo still.

Use the shared styles in `app/components/interaction.module.css` for action controls:

- Navigation keeps a blue fill for the current page. Other destinations use a light blue hover background.
- Filled actions use blue, deepen slightly on hover, and deepen again while pressed. Use this for finding release years, confirming filters, and trying another record.
- Quiet actions have a transparent background, light blue on hover, and blue while pressed. Use this for Settings, opening filters, refreshing the collection, and dismissing or clearing controls. Selected mood choices keep their blue fill.

Settings and Refresh collection are icon-only quiet controls with accessible names, tooltips, and 44px targets. The Settings panel closes when tapping outside or pressing Escape; Escape returns focus to the cog. Tapping inside the panel keeps it open.

Standalone actions share rounded corners, a minimum 44px height, and a dark blue keyboard focus ring. Collection metadata pills keep compact, matching heights while clickable genres share the filled action colors. Hover feedback applies to devices that support hovering; disabled controls keep their disabled appearance. Color changes replace skewing, lifting, and shifting shadows on action controls. The vinyl keeps its own record animation and stable blue label.

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
