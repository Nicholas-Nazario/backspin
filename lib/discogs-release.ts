import { z } from "zod";
import { request, type Token } from "./discogs";
import { createCatalogCache } from "./discogs-cache";

const releaseDetails = z.object({
  genres: z.array(z.string()).optional(),
  styles: z.array(z.string()).optional(),
  extraartists: z
    .array(z.object({ name: z.string(), role: z.string() }))
    .optional(),
});

const releases = createCatalogCache<z.infer<typeof releaseDetails>>();

export function discogsRelease(id: string, token: Token, signal: AbortSignal) {
  signal.throwIfAborted();
  return releases.load(id, async () => {
    const response = await request(
      "/releases/" + id,
      token,
      "GET",
      {},
      fetch,
      signal,
    );
    return releaseDetails.parse(await response.json());
  });
}
