# Spotify connection setup

Backspin connects to Spotify through its server-side authorization-code flow. Spotify handles login and consent. Settings identifies the connected profile. The Explore tab asks Backspin to fetch recent plays on demand and rank records from the authenticated Discogs collection. The browser receives the ranked picks and their supporting releases in one response. Backspin can reuse a completed result for up to ten minutes per connection. **Refresh picks** fetches Spotify again while reusing fresh Discogs catalog data.

## Manual dashboard setup

1. Open the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard) and create an app with **Web API** access. Use Backspin as the app name and `https://backspin.fly.dev` as its website.
2. Add the exact redirect URLs you will use:

   ```text
   https://backspin.fly.dev/api/spotify/callback
   http://127.0.0.1:3000/api/spotify/callback
   http://127.0.0.1:3011/api/spotify/callback
   ```

   The last entry is for the current local preview on port 3011. Spotify requires HTTPS except for explicit loopback IP addresses; `localhost` is not accepted. See [redirect URI requirements](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

3. In **Users and Access**, allowlist the Spotify accounts that will test the integration. New development-mode apps support up to five authorized users and require the app owner to maintain Spotify Premium. The limits apply even when Backspin itself is publicly reachable. See [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).
4. Copy the app's Client ID and Client Secret directly into your local environment or Fly secrets. Do not paste either secret into chat or commit it.
5. If the dashboard requests a privacy policy URL, use `https://backspin.fly.dev/privacy` after this change has been deployed. Review the page against how you operate the app, including database backups and hosting logs. Spotify requires a policy describing your data use; the page documents the implemented connection behavior. See [Spotify Developer Policy](https://developer.spotify.com/policy).

## Local configuration

For the existing port-3011 preview, set these values in `.env.local`:

```dotenv
APP_URL=http://127.0.0.1:3011
SPOTIFY_CLIENT_ID=your-client-id
SPOTIFY_CLIENT_SECRET=your-client-secret
```

Keep the existing `SESSION_KEY`; it encrypts both providers' separate cookies. Restart the development server and open **http://127.0.0.1:3011**, not localhost:

```sh
npm run dev -- --port 3011
```

Because Discogs and Spotify share the app origin, also register `http://127.0.0.1:3011/api/auth/callback` for your Discogs application. A Discogs cookie created on localhost does not carry over to 127.0.0.1, so connect Discogs again at the new origin. For port 3000, change both provider callback URLs and `APP_URL` to port 3000.

Settings shows both providers separately. Until Spotify credentials and a valid app origin are configured, the Spotify connect action is disabled. Missing Spotify configuration does not prevent Discogs browsing or recommendations.

## Production configuration

Set `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` using Fly secrets for the `backspin` app, then deploy the reviewed changes through your normal release process. Keep `APP_URL=https://backspin.fly.dev`, which is already configured in `fly.toml`. No new database table or infrastructure is required.

This setup does not configure a Spotify application, change your Fly secrets, or deploy the integration on your behalf.

## Authorization and storage

- Backspin requests `user-read-private` for the profile display name and `user-read-recently-played` for [recent plays](https://developer.spotify.com/documentation/web-api/reference/get-recently-played). Accounts connected before the recent-play scope was added must disconnect and reconnect. Choose **Find my picks** on the Explore tab to make a request. The existing picker remains available.
- Explore uses owned records first and checks the Discogs master catalog for other recent releases. Backspin sends album titles and artist names for these searches. Backspin checks eligible unmatched releases behind the same request using the shared Discogs rate limiter. Explore shows a warning if a provider interruption leaves the results incomplete.
- A random state binds the callback to a ten-minute encrypted, HttpOnly handshake cookie and a one-use attempt ID. The existing SQLite attempt table stores only the ID and expiry, never authorization codes, Spotify profile data, or credentials.
- The access token and display name live only in a separate encrypted, HttpOnly browser cookie. There is no auth localStorage or Spotify account table. The app holds token data transiently while completing authorization. Token values are not passed to client components or written to callback logs.
- The connection expires with Spotify's access token, usually after one hour, with an eight-hour upper bound. Refresh tokens returned by Spotify are discarded. Reconnect through Spotify when the connection expires; automatic token refresh is unavailable.
- Disconnecting Spotify clears its cookies and invalidates its pending authorization attempt. It leaves Discogs connected. Disconnecting Discogs leaves Spotify connected. To revoke the underlying Spotify grant, remove Backspin from [Spotify's apps page](https://www.spotify.com/account/apps/).
- Provider errors and cancellations return fixed messages without exposing authorization codes, credentials, or upstream response bodies. Both callback URLs are excluded from application request logging. Any hosting or proxy logs must also redact callback query strings.

The implementation follows Spotify's [authorization-code flow](https://developer.spotify.com/documentation/web-api/tutorials/code-flow).

## Branding and attribution

The Spotify section uses the unmodified official black full logo on the cream surface, with its original proportions, clear space, and a size above Spotify's 70px minimum. The footer names Spotify's trademarks and states that Backspin is not affiliated with or endorsed by Spotify. Asset provenance and usage terms are in [third-party notices](../THIRD_PARTY_NOTICES.md).

If Spotify catalog metadata, artwork, or playback is added later, it must carry the required Spotify branding and links back to Spotify at the point of use. The existing Discogs artwork and collection attribution remain Discogs attribution. See [Spotify's Design and Branding Guidelines](https://developer.spotify.com/documentation/design).

## Verification

```sh
npm test
npm run typecheck
npm run build
BACKSPIN_TEST_URL=http://localhost:3011 node --env-file=.env.local --import tsx tests/spotify.browser.ts
```

Unit fixtures cover state mismatch, expiry, replay, denial, provider failures, callback sanitization, same-origin checks, return-path validation, cookie isolation, and discarded refresh credentials. Browser fixtures cover service-specific identities/actions, expired cookies, safe feedback, Settings dismissal, logo loading, the public privacy page, and absence of access tokens in rendered HTML and localStorage. They intercept provider calls or supply isolated encrypted fixture cookies; they do not verify a live Spotify grant.

After configuring the dashboard and credentials, manually verify connect, cancellation, profile identity, session expiry/reconnect, and disconnect on the registered local and production origins. An unauthorized development-mode user may complete Spotify login but receive a 403 when the profile is requested; add them to the app allowlist.
