# Listening-room artwork

AI-generated SVG illustration created with Codex for Backspin during Phase 4A, approved November 16, 2026. Distributed under the project MIT license, retained in `LICENSE.txt`. No third-party scene illustrations were adopted. The inspected Openclipart gramophone candidate was rejected and is not distributed here.

## Files and adaptations

- `source.svg`: editable, original approved 2240 × 1260 composition. Its sample album cover and text are fictional design fixtures, not Discogs content.
- `dawn.svg`, `day.svg`, `dusk.svg`, `night.svg`: four palettes of the stationary app scene, with fictional cover/identity and moving disc, arm, leaf and one shelf spine separated from the base. The sleeve stand and fixed tonearm base remain.
- `turntable-{dawn,day,dusk,night}.svg`: matching stationary player layers extracted for portrait/mobile composition. `turntable.svg` retains the original daytime asset URL. The inline animated record and tonearm are rendered above this base.

All scene and player files are passive SVGs with no scripts, inline styles, event handlers, external references or embedded images. Edit `source.svg` and run `python3 scripts/prepare-room-art.py`, followed by Prettier on `app/listening/room-parts.tsx`, to regenerate the app bases and moving drawings. The prep script uses only Python’s standard library and is not a build dependency. The ignored local `plans/phase-4a` artifacts are not required to build or run the app.

## Placement and layers

The original stage is 16:9. The jacket occupies x=265, y=310, width=height=380. The app uses an uncropped HTML image in that position. The stand and contact shadow are in the scene asset. Identity is a separate HTML block beginning near x=790. Layer order: walls/light, window, counter, contact shadows/stand, player, plant, coffee, flowers, cabinet and front lip. The HTML jacket and identity overlay the background. The small-screen layout removes surrounding props and uses the extracted turntable.

The 4C player rotates its record in a circular local group inside the fixed projection; do not rotate an already flattened ellipse. `room-parts.tsx` contains original editable disc, arm and leaf geometry; `room-artwork.tsx` supplies placement and the two decorative shelf slots, and CSS Modules supply all animation. The moving sleeves are app-owned neutral artwork and never reuse or distort album covers. Disc center in original coordinates: (1004, 607), translated +420 x in the wide room. Tonearm pivot: (1230, 571), also translated +420 x. Record bay is translated +420 x and retains 306-unit LP spines. Motion is optional and cosmetic, not RPM or audio progress. The same illustration is generated in dawn/day/dusk/night palettes. The app selects lighting from a manual choice or device-local clock cutoffs; album art remains outside the palette transforms. When paused or reduced motion is enabled, the same drawings remain as a still fallback.

Album artwork and personal collection metadata are fetched through the existing authenticated collection workflow. They are never included in this static asset directory and are not licensed under the scene's MIT license.
