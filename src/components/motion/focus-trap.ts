"use client";

import { useEffect, type RefObject } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keeps the Tab key inside an open modal layer (plus its trigger, when the
 * trigger stays on screen as the way to close it). Without this, focus walks
 * on into the page behind the layer, where it cannot be seen.
 */
export function useFocusTrap(open: boolean, layer: RefObject<HTMLElement | null>, trigger?: RefObject<HTMLElement | null>): void {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !layer.current) return;
      const stops = [...(trigger?.current ? [trigger.current] : []), ...layer.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (!stops.includes(at as HTMLElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, layer, trigger]);
}
