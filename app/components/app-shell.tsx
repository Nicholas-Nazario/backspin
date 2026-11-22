import styles from "../page.module.css";
import {
  ArrowUpRightIcon,
  CompassIcon,
  StackIcon,
} from "@phosphor-icons/react/ssr";
import { session } from "../../lib/session";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import interaction from "./interaction.module.css";
import { SettingsMenu } from "./settings-menu";
import { spotifySession } from "../../lib/spotify-session";
import { spotifyConfiguration } from "../../lib/spotify";
export async function AppShell({
  children,
  active,
  error,
  tagline = "Less time choosing, more time listening.",
  spotifyResult,
}: {
  children: React.ReactNode;
  active: "discover" | "collection";
  error?: string;
  tagline?: string;
  spotifyResult?: string;
}) {
  const s = await session();
  const spotify = await spotifySession();
  const configured = !!(
    process.env.DISCOGS_CONSUMER_KEY &&
    process.env.DISCOGS_CONSUMER_SECRET &&
    process.env.SESSION_KEY
  );
  return (
    <main>
      <header className={styles.header}>
        <h1 className={styles.title}>
          <Link href="/" className={styles.brandLink} title="Back to Discover">
            Backspin
            <BrandMark size={36} />
          </Link>
        </h1>
        {s && (
          <nav className={styles.navigation} aria-label="Main navigation">
            <Link
              className={interaction.navigation}
              href="/"
              aria-current={active === "discover" ? "page" : undefined}
            >
              <CompassIcon size={19} aria-hidden="true" />
              Discover
            </Link>
            <Link
              className={interaction.navigation}
              href="/collection"
              aria-current={active === "collection" ? "page" : undefined}
            >
              <StackIcon size={19} aria-hidden="true" />
              Collection
            </Link>
          </nav>
        )}
        <SettingsMenu
          discogsUsername={s?.username ?? null}
          discogsConfigured={configured}
          spotifyDisplayName={spotify?.displayName ?? null}
          spotifyConfigured={!!spotifyConfiguration()}
          spotifyResult={spotifyResult}
          returnTo={active === "collection" ? "/collection" : "/"}
        />
      </header>
      {error && (
        <p role="alert" className={styles["notice"]}>
          Discogs connection was not completed. You can try connecting again.
        </p>
      )}
      {s ? (
        <>{children}</>
      ) : (
        <section className={styles["welcome"]}>
          <div className={styles["record"]} aria-hidden="true">
            ●
          </div>
          <h2>{tagline}</h2>
          <p>
            One album from your own collection, picked for right now. Connect
            Discogs to drop the needle.
          </p>
          {configured ? (
            <form action="/api/auth/connect" method="post">
              <button className={interaction.filled}>
                Connect Discogs{" "}
                <ArrowUpRightIcon size={18} aria-hidden="true" />
              </button>
            </form>
          ) : (
            <p className={styles["notice"]}>
              Connection setup is pending. Follow the local setup instructions
              in README.md.
            </p>
          )}
          <p className={styles["small"]}>
            No user access tokens are saved in our database. Connection lasts up
            to eight hours.
          </p>
        </section>
      )}
      <footer className={styles.footer}>
        {s && active === "discover" && (
          <p>
            <a
              href="https://www.discogs.com/mycollection"
              target="_blank"
              rel="noopener noreferrer"
            >
              Collection data and artwork provided by Discogs.
            </a>
          </p>
        )}
        <p>
          This application uses Discogs’ API but is not affiliated with,
          sponsored or endorsed by Discogs. ‘Discogs’ is a trademark of Zink
          Media, LLC.
        </p>
        <p>
          Spotify and the Spotify logo are trademarks of Spotify AB. Backspin is
          not affiliated with or endorsed by Spotify. Spotify authorization is
          provided by <a href="https://www.spotify.com/">Spotify</a>.
        </p>
        <p>
          <Link href="/privacy">Privacy and connections</Link>
        </p>
      </footer>
    </main>
  );
}
