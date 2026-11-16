# Artwork: technical and legal investigation

Investigated November 16, 2026. No application code added. Legal analysis below concerns US law; other jurisdictions differ. Conclusions are interpretations, not clearance from Discogs or artwork owners.

## Direct technical observations

Unauthenticated read-only requests with an identifying User-Agent succeeded for https://api.discogs.com/releases/249504 and https://api.discogs.com/masters/96559. The release returned four images, including a primary image and secondary images. The primary image URL returned HTTP 200 and image/jpeg without an API token. This establishes observed behavior for these samples, not an authentication guarantee for all resources. The developer reference remained inaccessible with HTTP 403.

| Field | Observed meaning |
|---|---|
| images[] | Multiple image descriptors on release/master details |
| type | primary or secondary; secondary does not identify back cover versus label |
| uri | Display image URL on i.discogs.com |
| resource_url | Same URL as uri in these samples |
| uri150 | Small thumbnail URL |
| width, height | Display-image dimensions |
| thumb | Release-level thumbnail URL |

Release sample images were 600×600; master sample dimensions included 600×594 and 592×600. These are observations, not a universal resolution ceiling. No raw uploaded original, per-image license category, rights-holder permission, or reliable semantic caption was present in these image descriptors. URLs are references to image bytes, not embedded image data.

The attempted public collection sample contained no records, so collection-summary cover_image/thumb fields were not verified in this investigation. Search payloads and authenticated private collection payloads also remain untested. Do not infer coverage from release details alone.

The CDN response advertised public, max-age=31536000. That HTTP cache policy does not override contractual freshness/retention rules. Refresh the upstream image selection, not merely continue displaying an old CDN URL indefinitely. Do not modify signed-looking URL paths to request higher resolutions or decode storage paths to bypass delivery controls.

## Product implications

Use the owned release's primary image by default; a master can depict a different edition. Discogs' image guidelines say primary normally means front cover but may mean a center label when there is no sleeve. Support non-square images and missing artwork. Keep album artwork static and readable; animate an app-owned vinyl illustration separately.

Use thumbnails for grids and the returned larger image for now playing. A 600-pixel source can occupy a substantial TV panel but is not native 4K artwork. Do not promise high-resolution scans or upscale through third-party AI services.

Prefer returned Discogs image URLs rather than creating a permanent hosted image library. Direct browser loading requires a browser test from the actual application origin; command-line success does not prove browser embedding policy. Canvas manipulation additionally depends on CORS and is unnecessary for normal img display. Verify response headers, failure behavior, and refresh behavior before choosing a proxy or optimizer; direct loading is not itself copyright clearance. Never place OAuth secrets into image URLs.

## What Discogs permits contractually

[API terms](https://support.discogs.com/hc/en-us/articles/360009334593-API-Terms-of-Use) classify images as restricted data and grant a revocable license to use restricted data to create and run websites/applications. This is affirmative support for in-app image use, rather than a blanket prohibition. A free, ad-free app displaying record artwork with record information is reasonably consistent with that purpose. No special clause expressly clears connected-account now-playing displays, however.

Restrictions remain: no commercial use or third-party transfer of restricted data, no rights violations, necessary-only storage, and the six-hour freshness rule. Include nearby linked Discogs data attribution and the prescribed non-affiliation notice. OAuth grants account access; it is not a separate artwork copyright license. The broad transfer restriction should not be assumed to prohibit every user-facing display when app use is expressly licensed, but redistribution, exports, and processing vendors remain interpretation questions.

## Underlying copyright is a separate question

[Discogs image guidelines](https://support.discogs.com/hc/en-us/articles/360005006874-Database-Guidelines-13-Images) allow uploads based on public-domain status, CC0 permission, or fair use for commentary/resale. Therefore not every image is licensed by the artwork's copyright owner for unrestricted reuse. The API terms disclaim a warranty of non-infringement. Neither signing into Discogs nor owning a physical record transfers reproduction/display rights in its cover art.

[17 USC 109(c)](https://www.copyright.gov/title17/92chap1.html#109) permits certain displays of a lawfully owned copy to viewers present where that copy is located. It is not a general license for our service to reproduce and transmit a Discogs scan over the internet. Photographing one's own jacket also does not automatically clear the underlying artwork.

[US Copyright Office fair-use guidance](https://www.copyright.gov/fair-use/) requires case-specific consideration of purpose, nature, amount, and market effect. Free operation helps but is not decisive. Identifying a record in a collection browser with artist/title/context is a more defensible rationale than reusing the cover purely as decorative wallpaper; this is our assessment, not a judicial determination. Full-cover reproduction, the creativity of the artwork, and possible image-licensing markets still matter. Reducing size or linking back does not automatically establish fair use. Adding factual context does not automatically make a display critical commentary.

## Answer for our scenario

Contractually, there is a reasonable basis for displaying returned cover images to connected users in a free collection/listening app, subject to the restrictions. There is insufficient evidence to promise blanket copyright permission for every image or an artwork-led ambient mode. Login limits collection exposure but does not cure artwork rights. A home display differs from commercial cafe use; the latter needs separate assessment even if the app itself is free.

Recommended design: artwork associated with the selected record, artist/title/year and useful context visible, linked Discogs attribution, no artwork download/export feature, no public cover galleries, no permanent image archive, and freshness checks during long sessions. These narrow the use; they do not guarantee legality.

## Targeted clarification to obtain

Ask Discogs whether its restricted-image license permits (1) direct embedding of returned images for authenticated owners browsing their collection, (2) a large static cover alongside album metadata in a home now-playing display, (3) normal browser caching under its CDN headers plus periodic API revalidation, and (4) any necessary image proxy/hosting processor. Ask whether additional rights clearance is expected for covers supplied on a fair-use basis. Discogs can clarify its contract but cannot necessarily license third-party artwork it does not own. No message has been sent.
