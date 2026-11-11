"use client";

import { useEffect } from "react";

/**
 * Back and Forward must land on the remembered scroll position at once. The
 * site scrolls smoothly for links within a page (`scroll-behavior: smooth` in
 * globals.css), and the browser applies that to its own scroll restoration
 * too, so without this a visitor returning to a long list watched thousands of
 * pixels fly past. Smooth scrolling is switched off for the moment a history
 * step takes. Mounted once in the root layout.
 */
export function HistoryScroll() {
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const onPopState = () => {
      const root = document.documentElement;
      root.style.scrollBehavior = "auto";
      clearTimeout(timer);
      timer = setTimeout(() => root.style.removeProperty("scroll-behavior"), 500);
    };
    // Capture: this must run before the router restores the page and the browser restores the scroll.
    window.addEventListener("popstate", onPopState, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("popstate", onPopState, true);
    };
  }, []);
  return null;
}
