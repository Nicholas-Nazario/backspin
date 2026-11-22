import Link from "next/link";
import styles from "./privacy.module.css";

export const metadata = { title: "Privacy and connections · Backspin" };

export default function PrivacyPage() {
  return (
    <main className={styles.page}>
      <Link href="/">Back to Backspin</Link>
      <h1>Privacy and connections</h1>
      <p>
        Backspin helps you choose a record from your Discogs collection. Discogs
        and Spotify handle their own sign-in and permission screens. Backspin
        does not receive or store your password for either service.
      </p>
      <h2>Discogs</h2>
      <p>
        Backspin reads your authorized collection and release details to browse
        your records and make album picks. Collection responses use a
        short-lived, account-scoped cache and are not saved to the application
        database. Shared original release years are cached separately. Personal
        year corrections are saved with your Discogs user ID and can be reset in
        record details.
      </p>
      <h2>Spotify</h2>
      <p>
        Connecting Spotify reads your display name for Settings and requests
        access to recent plays. When you ask for Spotify picks, Backspin fetches
        up to 50 recent plays and sends album names, artists, album identifiers,
        cover artwork URLs, and play timestamps to your browser to match against
        your collection. Backspin processes this information for the request and
        keeps it in page memory for the results. It does not save listening
        history to disk or send your Discogs collection to Spotify.
      </p>
      <h2>Cookies and stored data</h2>
      <p>
        Each service has its own encrypted, HttpOnly session cookie. Cookies use
        HTTPS protection in production and are not accessible to application
        JavaScript. Discogs sessions last up to eight hours. Spotify connections
        last until the access token expires, usually about an hour, and never
        longer than eight hours. Spotify refresh tokens are discarded. Browser
        localStorage is not used for credentials.
      </p>
      <p>
        The database contains original release years, personal year corrections,
        and expiring one-use authorization attempt IDs. It does not contain
        service access tokens, refresh tokens, or passwords. Pending
        authorization cookies and attempt IDs expire after ten minutes. Expired
        attempt IDs are cleaned up during authorization processing. Database
        backups, if made by the operator, can retain earlier year corrections.
      </p>
      <h2>Disconnecting and removing access</h2>
      <p>
        Disconnect either service in Settings to clear that service’s connection
        from this browser. The other service stays connected. You can also clear
        Backspin’s cookies in your browser. Disconnecting does not remove a
        permission grant at the provider: revoke it in{" "}
        <a href="https://www.discogs.com/settings/applications">
          Discogs settings
        </a>{" "}
        or{" "}
        <a href="https://www.spotify.com/account/apps/">Spotify’s apps page</a>.
      </p>
      <h2>Other services</h2>
      <p>
        Discogs supplies album artwork, and your browser requests those images
        directly. Spotify supplies the cover artwork for recently played albums.
        The hosting provider processes network requests to serve Backspin.
        Backspin does not implement advertising, analytics tracking, or a
        listening-history database. Spotify’s own handling of your data is
        described in its{" "}
        <a href="https://www.spotify.com/legal/privacy-policy/">
          privacy policy
        </a>
        .
      </p>
    </main>
  );
}
