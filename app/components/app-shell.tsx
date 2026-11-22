import styles from "../page.module.css";
import {
  GearSixIcon,
  ArrowUpRightIcon,
  SignOutIcon,
} from "@phosphor-icons/react/ssr";
import { session } from "../../lib/session";
import Link from "next/link";
import { BrandMark } from "./brand-mark";
import interaction from "./interaction.module.css";
export async function AppShell({
  children,
  active,
  error,
  tagline = "Less time choosing, more time listening.",
}: {
  children: React.ReactNode;
  active: "discover" | "collection";
  error?: string;
  tagline?: string;
}) {
  const s = await session();
  const configured = !!(
    process.env.DISCOGS_CONSUMER_KEY &&
    process.env.DISCOGS_CONSUMER_SECRET &&
    process.env.SESSION_KEY
  );
  return (
    <main>
      <header className={styles.header}>
        <h1 className={styles.title}>
          Backspin
          <span>
            <BrandMark size={36} />
          </span>
        </h1>
        {s && (
          <nav className={styles.navigation} aria-label="Main navigation">
            <Link
              className={interaction.navigation}
              href="/"
              aria-current={active === "discover" ? "page" : undefined}
            >
              Discover
            </Link>
            <Link
              className={interaction.navigation}
              href="/collection"
              aria-current={active === "collection" ? "page" : undefined}
            >
              Collection
            </Link>
          </nav>
        )}
        {s && (
          <details className={styles["settings"]}>
            <summary className={interaction.quiet}>
              <GearSixIcon size={18} aria-hidden="true" /> Settings
            </summary>
            <div className={styles["settings-menu"]}>
              <p>
                Connected as <strong>{s.username}</strong>
              </p>
              <form action="/api/auth/disconnect" method="post">
                <button className={interaction.filled}>
                  <SignOutIcon size={18} aria-hidden="true" /> Disconnect
                </button>
              </form>
              <p className={styles["small"]}>
                Disconnect signs you out here. Revoke app access in Discogs
                settings to remove its authorization.
              </p>
            </div>
          </details>
        )}
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
      </footer>
    </main>
  );
}
