# Phase 4: the listening room

Status: proposed plan and art direction. No Phase 4 application code or artwork assets have been created. Review and implement one milestone at a time.

## Objective

Make the now-playing view a place people enjoy leaving open for an entire record. The selected album should feel present in a small illustrated listening room, with the cover as the most distinctive element. The mix builder remains the main working screen; this is the room you enter once a record is on the turntable.

The experience succeeds when the still composition looks inviting, album identity is readable from across the room, motion remains pleasant after thirty minutes, and returning to the mix is effortless.

## Art direction: the sunny listening counter

A compact neighborhood record cafe rendered as a playful illustration: warm cream walls, an espresso-colored outline, a wooden counter, a friendly turntable, a leafy plant, a small vase of flowers, and one coffee cup. A jacket sits upright in its own stand. Sunlight and soft shadows establish depth without a realistic 3D scene.

Use the energy of a cozy turntable set as a reference for atmosphere and composition. Create original objects and arrangements; do not reproduce another show's branding or set design.

### Shape, texture, and color

- Rounded silhouettes, broad flat color areas, and gently irregular contours. Use one consistent dark outline weight relative to object size.
- A shallow stage with two or three depth layers. Slightly exaggerated knobs and leaves give objects character. Keep perspective internally consistent.
- Restrained grain in the background or counter only. No texture overlay on album artwork or small text.
- Day palette: cream `#FFF6DF`, espresso `#302B24`, leaf green `#276B51`, coral `#EF7257`, marigold `#EDB74B`, and a small sky-blue accent `#85BCCD`.
- Evening palette: deep warm brown `#26231F`, muted green `#354C3E`, cream text `#F5EBD4`, and subdued amber/coral highlights. Change the lighting and surrounding colors; keep the album cover unchanged.
- Use color deliberately: most of the frame is quiet, while the artwork and a few objects supply the strongest accents. Check text/control contrast during design rather than assuming the palette passes.

### Typography and icons

Choose a friendly, rounded display face for artist/album identity and a plain highly readable face for controls. Limit the number of weights. Test long names before selecting fonts, verify their licenses, and self-host the chosen files.

Phosphor remains the interface icon family. Custom scene illustrations share its rounded character without using enlarged UI icons as the finished turntable/plants. Include license notices for any third-party assets.

### Composition

Start with a 16:9 desktop/TV composition:

- A large upright jacket occupies the left side; target roughly 55–65% of viewport height in the first studies. Adjust for source quality and real artwork proportions.
- The turntable anchors the right side of the counter. A separate vinyl disc provides the main motion.
- Artist and album title sit in a quiet area above/near the turntable, clear of illustration outlines. The jacket remains the largest uninterrupted visual block.
- A plant at an outer edge, flowers, and coffee frame the setup. Keep sufficient open space; introduce each prop only if it improves the composition.
- The counter runs across the lower part of the scene. Soft shadows tie the jacket, turntable, and props together.
- Controls form a small functional layer near the bottom and recede when idle. A discreet Discogs attribution stays beside the album information, with a generous readable/clickable target when controls are active.

Preserve the full jacket with its actual aspect ratio. Discogs' primary image may be a center label or non-square sleeve. Never stretch, repaint, crop into a disc, or rotate the jacket. Use a neutral sleeve treatment for missing artwork. The vinyl label and other scene graphics are app-owned artwork.

### Information budget

Always visible: selected cover, artist, album title, and required attribution. Original year is a secondary detail when known. A maximum of two genre/style labels may be included only if the composition benefits from them; unknown fields create no empty labels.

No introductory slogans, collection counts, redundant set counts, credits walls, permanent status explanations, personal mood fields, or scrolling marquees. The title itself should not scroll to be readable. Use bounded wrapping and adapt the layout for long text; show full details on demand.

A next-record preview belongs with active controls, not permanently beside the current cover. It should not compete with the album currently playing.

## Scene assets

Build the first scene with modular, code-native SVG illustrations and CSS Modules. Required assets are the turntable chassis, platter/disc, tonearm, sleeve stand, counter, plant, flowers/vase, cup, and day/evening lighting shapes. Divide artwork only where independent layout or movement needs it.

Start with original vector work. Raster assets are optional if later approved art direction needs them; document provenance and licenses, and follow the image generation workflow if that is chosen. Do not build a generic scene editor, a collection of room themes, a character system, or a 3D engine for this phase.

Record layer order, scaling anchors, colors, and motion pivots in a small asset note so future changes preserve a coherent scene. Scene illustration may be developed as standalone review artifacts before being wired into the app.

## Motion direction

The room should feel alive at a glance and calm when watched continuously.

| Element | Proposed behavior | Guardrail |
|---|---|---|
| Vinyl | Slow constant rotation while a record is selected | Cosmetic; not a claim of RPM, audio progress, or synchronization |
| Plant | Very small, slow leaf sway on one or two groups | Avoid moving the whole room or constant wobble |
| Cup | Occasional subtle steam | Omit if it becomes distracting or costly |
| Lighting | Static first; evaluate a very slow ambient shift later | Never dim/change the cover or reduce text contrast |
| Record change | Brief cover/metadata transition | No spinning jackets, fake sleeve morphs, or elaborate repeated reveal |
| Controls | Gentle fade after inactivity | Never hide a focused control or make the first tap activate a hidden action |

Provide an explicit motion toggle. Reduced-motion preference defaults to a still scene and simple state changes. Stop unnecessary animation while the tab is hidden. Keep scene motion separate from manual listening state: pausing animation does not clear the selected record. No waveforms, pretend EQ meters, automatic track timing, side detection, or audio-reactive movement.

## Interaction and state

- Add an obvious view action to the current-record controls: enter the listening room without navigating away or losing the temporary mix.
- The first implementation uses a full-viewport view mode on the existing mix route. Move mix/now-playing state above view-specific components as needed; do not duplicate that state or persist it as a playlist.
- Entering the room does not automatically request browser fullscreen. Provide an explicit fullscreen action; handle unsupported/denied requests gracefully and keep normal viewport mode usable.
- Keep previous, next, stop, day/evening, motion, fullscreen, and return-to-mix controls accessible. Use the existing now-playing semantics and disabled boundaries.
- Proposed idle timeout: eight seconds after pointer/key activity, provided no control is focused and no menu/dialog is open. Touch interaction reveals controls before taking an action. Keyboard focus reveals them immediately.
- Show the next album as a small optional preview while controls are visible. Do not add queue editing inside the listening scene.
- Escape exits browser fullscreen through normal browser behavior; once fullscreen is exited, Escape can return from the listening room to the mix. Avoid interfering with open dialogs or requiring repeated unexplained key presses.
- If the current album falls outside the edited mix, keep it selected and disable unavailable navigation. Do not change the illustrated record as a side effect of editing the queue.
- Stop clears the selected record and returns to the mix. Browser fullscreen should be exited when this application entered it and the user leaves the room.
- With no selected record, provide a concise selection action back to the mix. Do not invent a playing record.
- Reload, navigation, or session expiry does not save a mix or listening history. Session recovery must be explicit; no hidden credential storage is introduced.

## Responsive and long-session behavior

TV/desktop is the primary composition. Keep safe margins around screen edges and test at 1280×720, 1920×1080, 2560×1440, and 4K layout dimensions. A larger viewport does not imply higher-resolution artwork; use returned image dimensions and avoid promising native 4K covers.

Adapt tablet/portrait by stacking the jacket/identity above a simplified turntable. On phones, preserve artwork and controls first; remove peripheral props before shrinking the cover to a thumbnail. No horizontal scrolling or tiny decorative text.

Reuse existing metadata freshness and account checks without remounting the entire scene on each refresh. Preserve the current record's ID through a successful refresh, and do not reset animation/layout every five minutes. Do not leave expired upstream content displayed after a failed refresh. Provide a quiet retry or reconnect state with a clear path back to controls. Handle removed records and failed artwork independently from account failure.

Load only the current image and, if useful, one eligible next image. Reuse existing data instead of continuously fetching credits, collection details, or frame-based updates. Use bounded CSS/SVG animation, avoid continuously updating React state, and profile before adding rendering layers or dependencies. No service worker/offline artwork archive, WebGL scene, or image export feature.

## Milestones and check-ins

### 4A — Composition studies and visual specification

Produce two static arrangements of the same proposed listening counter: front-on and a shallow angled view. Use representative light, dark, colorful, non-square, missing-cover, and long-title examples. Provide a day/evening study for the favored arrangement. These are design review artifacts, not a functional implementation.

Review: jacket prominence, amount of decoration, friendliness of illustration, typography, contrast, and room-distance readability. Select one arrangement and revise the art direction document to match. This is the main visual checkpoint before detailed asset work.

### 4B — Static listening room

Create the selected scene assets and implement the responsive still composition with real selected-record data. Add enter/return behavior, existing listening controls, missing artwork treatment, and required attribution. Keep the existing mix state alive outside the scene component. Keep styles scoped and avoid inline CSS.

Verify: selection survives entering/exiting; next/previous boundaries and outside-mix state are correct; long titles and different artwork sizes fit; mobile and TV layouts remain usable. Review using the user's actual records before animation.

### 4C — Ambient motion and transitions

Add vinyl rotation and restrained supporting motion, record-change transitions, reduced motion, manual motion pause, and hidden-tab behavior. Keep a still-frame fallback.

Verify: no fake audio synchronization, no flicker/layout jumps, controls stay responsive, and the composition remains comfortable for at least thirty minutes. Review the speed and amount of motion before adding anything else.

### 4D — Room-display controls and evening treatment

Add explicit fullscreen, idle/reveal behavior, day/evening presentation, and the small next-record preview. Ensure keyboard/touch operation and fullscreen failure recovery.

Verify: safe first touch, visible focused controls, screen-edge spacing, theme contrast, supported and unsupported fullscreen behavior, and a clear return to the mix. Review on a real TV/monitor where possible; browser viewport tests do not substitute for distance viewing.

### 4E — Long-session and performance pass

Exercise refresh, expired metadata, rate limits, unavailable artwork, session expiry, background/resume, and removed records. Profile browser CPU/memory and the app's memory under representative use. Compare static and animated versions to identify expensive effects; set measured budgets after the baseline, rather than guessing a universal target.

Verify a sustained session, including forced short-expiry fixtures and an actual longer listening session. Confirm no unbounded cache/request/DOM growth, stale content, or unnecessary rerenders. Reduce motion complexity if needed. No additional themes or features during this pass.

At every milestone: show the concrete result, summarize verification and limitations, and check in before moving to the next one.

## Completion criteria and scope boundaries

Phase 4 is complete when one coherent illustrated room supports day/evening viewing, large artwork and readable identity, gentle optional motion, manual listening navigation, explicit fullscreen, accessible idle controls, responsive fallback, and dependable long-session behavior.

Personal tags, mood enrichment, listening history, saved playlists, streaming, automatic listening detection, public sharing, multiple room packs, and a scene customizer are outside this phase. Musical influence stories remain future sourced-content work.

Art direction approval is not artwork licensing clearance. Retain the existing Discogs attribution/licensing constraints and resolve the documented ambient-image questions before public launch. Planning and local implementation do not authorize deployment or contacting Discogs.

## Decisions for the first design review

Recommended starting choices: one counter scene; daytime as default; a separate app-owned vinyl disc; front-on composition as the simpler baseline; illustration in SVG; current album identity as the only permanent text beyond attribution; eight-second idle controls; same-route listening mode to preserve the ephemeral mix.

The first review can change the composition, prop density, typography, and palette balance. Avoid committing to all those choices in implementation before seeing the studies.
