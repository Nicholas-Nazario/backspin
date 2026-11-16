"use client";
import { useEffect, useState } from "react";
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
  const prompts = collectionPrompts(entries),
    signature = JSON.stringify(prompts);
  const [text, setText] = useState("Search your collection…");
  useEffect(() => {
    const choices: string[] = JSON.parse(signature);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    function start() {
      clearTimeout(timer);
      if (paused || media.matches || !choices.length) {
        setText("Search your collection…");
        return;
      }
      let index = 0,
        position = 0,
        erasing = false;
      setText("");
      function step() {
        if (cancelled) return;
        const prompt = choices[index];
        if (!erasing) {
          position++;
          setText(prompt.slice(0, position));
          if (position === prompt.length) {
            erasing = true;
            timer = setTimeout(step, 2800);
            return;
          }
        } else {
          position--;
          setText(prompt.slice(0, position));
          if (position === 0) {
            index = (index + 1) % choices.length;
            erasing = false;
            timer = setTimeout(step, 450);
            return;
          }
        }
        timer = setTimeout(step, erasing ? 12 : 25);
      }
      timer = setTimeout(step, 600);
    }
    start();
    media.addEventListener("change", start);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      media.removeEventListener("change", start);
    };
  }, [signature, paused]);
  return text;
}
