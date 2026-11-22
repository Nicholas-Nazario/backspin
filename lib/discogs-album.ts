import { z } from "zod";
import { albumTitle, artistKey, artistKeys, normalize } from "./album-matching";
import { json, type Token } from "./discogs";
import type { CatalogAlbum } from "./recent-recommendation";

const resultSchema = z.object({
  id: z.number(),
  type: z.literal("master"),
  title: z.string(),
  genre: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
  year: z.union([z.string(), z.number()]).optional(),
});

export async function findDiscogsAlbum(
  title: string,
  artists: string[],
  token: Token,
  signal: AbortSignal,
  fetcher: typeof fetch = fetch,
): Promise<CatalogAlbum | null> {
  if (!artistKeys(artists).length) return null;
  const album = albumTitle(title);
  const params = new URLSearchParams({
    type: "master",
    q: `${artists.join(" ")} ${album}`,
    per_page: "20",
  });
  const { value } = await json("/database/search?" + params, token, {
    signal,
    fetcher,
  });
  const { results } = z.object({ results: z.array(z.unknown()) }).parse(value);
  const expectedCredit = artistKey(artists.join(" "));
  const expectedTitle = normalize(album);
  const matches = new Map<number, z.infer<typeof resultSchema>>();
  for (const result of results) {
    const parsed = resultSchema.safeParse(result);
    if (!parsed.success) continue;
    const candidate = parsed.data;
    const parts = candidate.title.split(" - ");
    const matchesCredit = parts
      .slice(1)
      .some(
        (_, index) =>
          artistKey(parts.slice(0, index + 1).join(" - ")) === expectedCredit &&
          normalize(albumTitle(parts.slice(index + 1).join(" - "))) ===
            expectedTitle,
      );
    if (matchesCredit) matches.set(candidate.id, candidate);
  }
  if (matches.size !== 1) return null;
  const match = [...matches.values()][0];
  const year = Number(match.year);
  return {
    genres: match.genre ?? [],
    styles: match.style ?? [],
    year: Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : null,
  };
}
