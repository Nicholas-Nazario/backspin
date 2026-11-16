import type { Entry } from "./collection";

export function listeningPosition(queue: Entry[], instanceId: number | null) {
  const index = queue.findIndex((entry) => entry.instance_id === instanceId);
  return {
    index,
    previous: index > 0 ? queue[index - 1] : null,
    next: index >= 0 && index < queue.length - 1 ? queue[index + 1] : null,
  };
}
