/**
 * Whether a page is being fetched right now. `src/instrumentation-client.ts`
 * starts it when the router begins a navigation; <RouteProgress> ends it when
 * the new address is on screen and draws the bar. Kept outside React so that a
 * navigation never causes a re-render just to move a progress bar.
 */
export type RouteProgressState = "idle" | "loading" | "done";

let state: RouteProgressState = "idle";
let safety: ReturnType<typeof setTimeout> | undefined;
let settle: ReturnType<typeof setTimeout> | undefined;
const listeners = new Set<(state: RouteProgressState) => void>();

function set(next: RouteProgressState) {
  if (state === next) return;
  state = next;
  for (const listener of listeners) listener(state);
}

export const routeProgress = {
  get(): RouteProgressState {
    return state;
  },
  subscribe(listener: (state: RouteProgressState) => void): () => void {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  start() {
    clearTimeout(safety);
    clearTimeout(settle);
    set("loading");
    // Never leave the bar hanging if a navigation is abandoned or fails.
    safety = setTimeout(() => routeProgress.done(), 15_000);
  },
  done() {
    if (state !== "loading") return;
    clearTimeout(safety);
    set("done");
    settle = setTimeout(() => set("idle"), 400);
  },
};
