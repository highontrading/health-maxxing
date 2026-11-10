"use client";

import { useSyncExternalStore } from "react";

/**
 * Small hooks for values that only exist in the browser. Each returns a
 * placeholder on the server and during hydration, then the real value, without
 * an effect that sets state.
 */

const never = () => () => {};

/** False on the server and during hydration, true afterwards. */
export function useMounted(): boolean {
  return useSyncExternalStore(never, () => true, () => false);
}

const onHistory = (notify: () => void) => {
  window.addEventListener("popstate", notify);
  return () => window.removeEventListener("popstate", notify);
};

/** A query-string value such as ?topic=sleep. Null until the page has hydrated. */
export function useQueryParam(name: string): string | null {
  return useSyncExternalStore(
    onHistory,
    () => new URLSearchParams(window.location.search).get(name) ?? "",
    () => null,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Today's date in the visitor's time zone as "YYYY-MM-DD", or null before hydration. */
export function useToday(): string | null {
  return useSyncExternalStore(
    never,
    () => {
      const now = new Date();
      return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
    },
    () => null,
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";
const onMotionPreference = (notify: () => void) => {
  const query = window.matchMedia(REDUCED_MOTION);
  query.addEventListener("change", notify);
  return () => query.removeEventListener("change", notify);
};

/**
 * True when the visitor asked their device for less motion. CSS already
 * handles this for every animation and transition (globals.css); use the hook
 * only for motion that JavaScript drives, such as counting a number up.
 * False on the server and until the page has hydrated.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    onMotionPreference,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
