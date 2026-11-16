export async function api(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { cache: "no-store", signal });
  const body = await response.json();
  if (!response.ok) throw new Error(body.error || "Unable to load data");
  return body;
}
