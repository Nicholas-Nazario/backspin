export type Entry = {
  instance_id: number;
  id: number;
  folder_id?: number;
  date_added?: string;
  basic_information: {
    title: string;
    master_id?: number;
    artists: { name: string }[];
    formats?: { name: string }[];
    genres?: string[];
    styles?: string[];
    cover_image?: string;
    thumb?: string;
  };
};
export type Year = {
  year: number | null;
  source: "master" | "unknown";
};
export function originalYear(
  entry: Entry,

  masters: Record<number, number | null>,
): Year {
  const year = masters[entry.basic_information.master_id || 0];
  return year ? { year, source: "master" } : { year: null, source: "unknown" };
}
export type Filters = {
  query: string;
  genre: string;
  genres?: string[];
  style: string;
  artist: string;
  format: string;
  era: string;
  folder: string;
  sort: string;
  group: boolean;
};
const artistCollator = new Intl.Collator("en", {
  sensitivity: "base",
  numeric: true,
});
function artistSortKey(entry: Entry) {
  const names = entry.basic_information.artists
    .map((artist) => artist.name.trim())
    .filter(Boolean);
  const compilation =
    names.length === 1 && /^(various|various artists)$/i.test(names[0]);
  return {
    category: names.length === 0 ? 2 : compilation ? 1 : 0,
    name: compilation
      ? ""
      : names.map((name) => name.replace(/^(the|an|a)\s+/i, "")).join(", "),
  };
}
function compareArtists(a: Entry, b: Entry) {
  const left = artistSortKey(a),
    right = artistSortKey(b);
  return (
    left.category - right.category ||
    artistCollator.compare(left.name, right.name) ||
    artistCollator.compare(a.basic_information.title, b.basic_information.title)
  );
}
export function workKey(entry: Entry) {
  return entry.basic_information.master_id
    ? "m" + entry.basic_information.master_id
    : "r" + entry.id;
}
export function explore(
  entries: Entry[],
  f: Filters,

  masters: Record<number, number | null>,
) {
  const query = f.query.trim().toLocaleLowerCase();
  const filtered = entries.filter((e) => {
    const b = e.basic_information,
      y = originalYear(e, masters).year;
    return (
      (!query ||
        [
          b.title,
          ...b.artists.map((a) => a.name),
          ...(b.genres || []),
          ...(b.styles || []),
        ]
          .join(" ")
          .toLocaleLowerCase()
          .includes(query)) &&
      (!(f.genres?.length || f.genre) ||
        [...(f.genres || []), ...(f.genre ? [f.genre] : [])].some((g) =>
          b.genres?.includes(g),
        )) &&
      (!f.style || b.styles?.includes(f.style)) &&
      (!f.artist || b.artists.some((a) => a.name === f.artist)) &&
      (!f.format || b.formats?.some((a) => a.name === f.format)) &&
      (!f.folder || String(e.folder_id) === f.folder) &&
      (!f.era ||
        (f.era === "unknown"
          ? y === null
          : y !== null && Math.floor(y / 10) * 10 === Number(f.era)))
    );
  });
  filtered.sort((a, b) =>
    f.sort === "artist"
      ? compareArtists(a, b)
      : f.sort === "year"
        ? (originalYear(a, masters).year ?? 9999) -
          (originalYear(b, masters).year ?? 9999)
        : f.sort === "added"
          ? (b.date_added || "").localeCompare(a.date_added || "")
          : a.basic_information.title.localeCompare(b.basic_information.title),
  );
  const groups = new Map<string, Entry[]>();
  for (const e of filtered) {
    const key = f.group ? "work:" + workKey(e) : "instance:" + e.instance_id;
    groups.set(key, [...(groups.get(key) || []), e]);
  }
  return [...groups.values()];
}
