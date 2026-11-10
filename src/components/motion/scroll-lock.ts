"use client";

import { useEffect } from "react";

let locks = 0;

/**
 * Stops the page behind a dialog or full-screen menu from scrolling while
 * `active` is true. Several layers can hold the lock at once; the page scrolls
 * again when the last one lets go. The scrollbar's space is kept, so nothing
 * shifts sideways (see `html.scroll-locked` in styles/motion/utilities.css).
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    locks += 1;
    document.documentElement.classList.add("scroll-locked");
    return () => {
      locks -= 1;
      if (locks === 0) document.documentElement.classList.remove("scroll-locked");
    };
  }, [active]);
}
