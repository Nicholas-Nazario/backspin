# Backspin

Less time choosing, more time listening.

Backspin helps you choose one album from the records you already own. Connect your Discogs collection and **Drop the needle** for a pick. Mood explanations appear when they add specific context.

## Three moments

1. **Open.** Drop the needle immediately, or choose **Narrow it down**.
2. **Discover.** See one album, its artwork, and a grounded reason to give it a spin.
3. **Decide.** Put on the record, or choose **Try another** within the same pool.

The optional filter sheet contains **Genre**, **Mood**, and **Era**. Genre and era are firm limits. Mood uses simple genre/style hints to give matching records more weight; it never excludes an otherwise eligible album. Explanations disclose when there is no clear mood match. These hints are an initial recommendation approach, not audio analysis or a learned model.

Era uses synced original release years and personal corrections, never pressing dates. Sync original years from the sheet; unknown years stay out of era-specific picks. Cached years restore automatically, and a paused or partial sync can resume. An empty pool offers filter changes rather than silently relaxing your limits.

Try another avoids the current album when alternatives exist. Extra owned copies do not give an album extra chances. Filters and picks last for the current page visit. Backspin does not play audio or persist listening history. Spotify integration and learned recommendations are not implemented yet.

## Explore your collection

The collection browser remains available for artwork, search, filters, record details, and personal original-year corrections. Multi-album sets and the visual listening room are retired from the main experience; their previous implementation remains in the repository pending a separate cleanup.

## Connect your collection

Backspin uses Discogs authorization, so you sign in with Discogs without giving Backspin your password. Your collection loads progressively. Disconnecting clears your local session; you can revoke Backspin’s authorization in Discogs settings.

To run Backspin locally, follow the [development and operations guide](docs/DEVELOPMENT.md), which covers setup, verification, security, backups, and deployment preparation.

Collection snapshots refresh at the five-minute cache expiry. Routine refreshes keep the current view in place and publish the complete collection together. The collection count includes the last Discogs fetch time. New picks pause during refresh; failed refreshes clear unavailable records and offer a retry.
