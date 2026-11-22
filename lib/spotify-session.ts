import { cookies } from "next/headers";
import { z } from "zod";
import { unseal } from "./session";

export const SPOTIFY_SESSION_COOKIE = "backspin_spotify";
export const SPOTIFY_HANDSHAKE_COOKIE = "backspin_spotify_handshake";
export const spotifyReturnPath = z.enum(["/", "/collection", "/spotify"]);
export type SpotifyReturnPath = z.infer<typeof spotifyReturnPath>;

export const spotifyHandshakeSchema = z.object({
  purpose: z.literal("spotify-handshake"),
  id: z.string().uuid(),
  state: z.string().min(32).max(128),
  returnTo: spotifyReturnPath,
  expires: z.number(),
});
export const spotifySessionSchema = z.object({
  purpose: z.literal("spotify-session"),
  accessToken: z.string().min(1).max(2048),
  displayName: z.string().min(1).max(200),
  expires: z.number(),
});

export function readSpotifySession(
  value: string | undefined,
  now = Date.now(),
) {
  const parsed = spotifySessionSchema.safeParse(value ? unseal(value) : null);
  return parsed.success && parsed.data.expires > now ? parsed.data : null;
}

export async function spotifySession() {
  return readSpotifySession(
    (await cookies()).get(SPOTIFY_SESSION_COOKIE)?.value,
  );
}
