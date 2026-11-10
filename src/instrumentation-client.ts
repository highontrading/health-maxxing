import { routeProgress } from "@/lib/route-progress";

/** Called by Next.js when a client-side navigation starts. Drives the route progress bar. */
export function onRouterTransitionStart(url: string) {
  try {
    const next = new URL(url, window.location.href);
    // Same page (or only the #hash changes): nothing will load.
    if (next.pathname === window.location.pathname && next.search === window.location.search) return;
    routeProgress.start();
  } catch {
    // An address the browser cannot parse is not worth a progress bar.
  }
}
