export function normalize(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/\p{M}/gu, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

export function artistKey(name: string) {
  return normalize(name.replace(/\s+\(\d+\)$/, ""));
}

const editionLabel =
  /^(?:[\d-]+\s+)?(?:deluxe|expanded|remaster(?:ed)?|\d+(?:st|nd|rd|th) anniversary)(?:\s+(?:edition|version|remaster(?:ed)?|\d{4}))*$/i;

export function albumTitle(title: string): string {
  const suffix =
    title.match(/\s*[([]([^()[\]]+)[)\]]\s*$/) ??
    title.match(/\s+[-–—]\s+([^–—]+)$/);
  return suffix && editionLabel.test(suffix[1].trim())
    ? title.slice(0, suffix.index).trim()
    : title.trim();
}

export function albumKey(title: string, artists: string[]) {
  return JSON.stringify([
    normalize(albumTitle(title)),
    artistKeys(artists).sort(),
  ]);
}

export function artistKeys(artists: string[]) {
  return [...new Set(artists.map(artistKey))].filter(
    (artist) => artist && artist !== "various" && artist !== "various artists",
  );
}
