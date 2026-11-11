"use client";

import { useEffect } from "react";

let locks = 0;

/**
 * Stops the page behind a dialog or full-screen menu from scrolling while
 * `active` is true. Several layers can hold the lock at once; the page scrolls
 * again when the last one lets go. The width of the scrollbar it removes is
 * kept as padding on the page, so nothing shifts sideways whether or not the
 * page had a scrollbar (see `html.scroll-locked` in styles/motion/utilities.css).
 */
export function useScrollLock(active: boolean): void {
  useEffect(() => {
    if (!active) return;
    const root = document.documentElement;
    if (locks === 0) {
      root.style.setProperty("--scrollbar-gap", `${window.innerWidth - root.clientWidth}px`);
      root.classList.add("scroll-locked");
    }
    locks += 1;
    return () => {
      locks -= 1;
      if (locks === 0) {
        root.classList.remove("scroll-locked");
        root.style.removeProperty("--scrollbar-gap");
      }
    };
  }, [active]);
}
