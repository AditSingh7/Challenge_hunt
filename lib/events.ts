type PlatformEvent =
  | { type: "leaderboard" }
  | { type: "challenges" }
  | { type: "submissions" }
  | { type: "users" }
  | { type: "stats" }
  | { type: "settings" }
  | { type: "warning"; username: string; teamName: string | null; violations: number; banned: boolean };

type Handler = (event: PlatformEvent) => void;

const globalStore = globalThis as unknown as {
  __htpSubscribers?: Set<Handler>;
};

function subscribers(): Set<Handler> {
  if (!globalStore.__htpSubscribers) globalStore.__htpSubscribers = new Set();
  return globalStore.__htpSubscribers;
}

export function subscribe(handler: Handler): () => void {
  const set = subscribers();
  set.add(handler);
  return () => {
    set.delete(handler);
  };
}

export function broadcast(event: PlatformEvent) {
  for (const handler of subscribers()) {
    try {
      handler(event);
    } catch {
      // ignore broken subscribers
    }
  }
}

export type { PlatformEvent };
