"use client";
import { useTypedText } from "./components/use-typed-text";
import type { Entry } from "../lib/collection";
export function collectionPrompts(entries: Entry[]) {
  const artists = [
    ...new Set(
      entries.flatMap((e) =>
        e.basic_information.artists.map((a) => a.name.replace(/ \(\d+\)$/, "")),
      ),
    ),
  ];
  const albums = [...new Set(entries.map((e) => e.basic_information.title))];
  const genres = [
    ...new Set(entries.flatMap((e) => e.basic_information.genres || [])),
  ];
  const styles = [
    ...new Set(entries.flatMap((e) => e.basic_information.styles || [])),
  ];
  return [
    ...(artists[0] ? [`A little ${artists[0]}?`] : []),
    ...(albums[0] ? [`Where’s that ${albums[0]} record…`] : []),
    ...(genres[0] ? [`In the mood for ${genres[0].toLowerCase()}?`] : []),
    ...(artists[1] ? [`How about some ${artists[1]}?`] : []),
    ...(styles[0] ? [`Let’s dig into ${styles[0].toLowerCase()}…`] : []),
    ...(genres[1] ? [`Got any ${genres[1].toLowerCase()}?`] : []),
  ].filter((p) => p.length <= 85);
}
export function useSearchPrompt(entries: Entry[], paused: boolean) {
  return useTypedText(
    collectionPrompts(entries),
    "Search your collection…",
    paused,
  );
}
