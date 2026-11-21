import { originalYear, workKey, type Entry } from "./collection";

// These are transparent metadata hints, not inferred listening habits or audio analysis.
export const moodHints = {
  Mellow: [
    "ambient",
    "downtempo",
    "soul-jazz",
    "smooth jazz",
    "dream pop",
    "chillwave",
  ],
  Upbeat: ["funk", "disco", "dance-pop", "house", "boogie", "ska", "synth-pop"],
  Focused: [
    "ambient",
    "minimal",
    "classical",
    "instrumental",
    "modern classical",
  ],
  Adventurous: [
    "experimental",
    "avant-garde",
    "free jazz",
    "psychedelic rock",
    "abstract",
  ],
} as const;
export type Mood = keyof typeof moodHints;
export type RecommendationFilters = {
  genre: string;
  mood: Mood | "";
  era: string;
};
export const emptyRecommendationFilters: RecommendationFilters = {
  genre: "",
  mood: "",
  era: "",
};
export type YearContext = {
  corrections: Record<number, number>;
  masters: Record<number, number | null>;
};
export function recommendationPool(
  entries: Entry[],
  filters: RecommendationFilters,
  years: YearContext,
) {
  return entries.filter((entry) => {
    const year = originalYear(entry, years.corrections, years.masters).year;
    return (
      (!filters.genre ||
        entry.basic_information.genres?.includes(filters.genre)) &&
      (!filters.era ||
        (year !== null && Math.floor(year / 10) * 10 === Number(filters.era)))
    );
  });
}
export function moodMatch(entry: Entry, mood: RecommendationFilters["mood"]) {
  if (!mood) return undefined;
  const tags = [
    ...(entry.basic_information.styles || []),
    ...(entry.basic_information.genres || []),
  ];
  return tags.find((tag) =>
    (moodHints[mood] as readonly string[]).includes(tag.toLowerCase()),
  );
}
export function pickRecommendation(
  pool: Entry[],
  mood: RecommendationFilters["mood"],
  previous?: string,
  random = Math.random,
) {
  // Choose works uniformly so extra copies do not give an album extra chances.
  const works = new Map<string, Entry>();
  for (const entry of pool) {
    const key = workKey(entry);
    if (
      !works.has(key) ||
      (!moodMatch(works.get(key)!, mood) && moodMatch(entry, mood))
    )
      works.set(key, entry);
  }
  const candidates = [...works.values()].filter(
    (entry) => works.size === 1 || workKey(entry) !== previous,
  );
  const weights = candidates.map((entry) => (moodMatch(entry, mood) ? 4 : 1));
  let ticket = random() * weights.reduce((sum, weight) => sum + weight, 0);
  return (
    candidates.find((_, index) => (ticket -= weights[index]) < 0) ||
    candidates.at(-1) ||
    null
  );
}
export function recommendationReason(
  entry: Entry,
  filters: RecommendationFilters,
) {
  const match = moodMatch(entry, filters.mood);
  if (match)
    return `Its ${match} tag nudged it toward your ${filters.mood.toLowerCase()} mood.`;
  if (filters.mood)
    return `No clear ${filters.mood.toLowerCase()} match in its genre or style tags.`;
  return "";
}
