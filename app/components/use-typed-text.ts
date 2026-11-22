import { useEffect, useState } from "react";

export function useTypedText(
  prompts: string[],
  fallback: string,
  paused: boolean,
  randomOrder = false,
) {
  const signature = JSON.stringify(prompts);
  const [text, setText] = useState(fallback);
  useEffect(() => {
    const choices: string[] = JSON.parse(signature);
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    let timer: ReturnType<typeof setTimeout>;
    let cancelled = false;
    function start() {
      clearTimeout(timer);
      if (paused || media.matches || !choices.length) {
        setText(fallback);
        return;
      }
      let index = randomOrder ? Math.floor(Math.random() * choices.length) : 0,
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
            // Random rotation skips the current prompt whenever there is a choice.
            const offset =
              randomOrder && choices.length > 1
                ? 1 + Math.floor(Math.random() * (choices.length - 1))
                : 1;
            index = (index + offset) % choices.length;
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
  }, [signature, fallback, paused, randomOrder]);
  return text;
}
