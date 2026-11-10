"use client";

import { useEffect } from "react";

/** Elements that arrive together cascade; after this many steps they simply arrive together. */
const MAX_STEPS = 6;

/**
 * Shows `.reveal` elements as they scroll into view (the classes are in
 * `src/app/styles/motion/utilities.css`). Mounted once in the site layout.
 *
 * - Content is visible until this runs, so nothing is hidden without JavaScript.
 * - An element that is already on screen when it is found is shown at once,
 *   with no animation: that covers the first screen of every page, including a
 *   page that has just opened through a page transition.
 * - New content is picked up whenever it is added to the page (a page change,
 *   a section that streams in, a filtered list), not only when the address
 *   changes, so nothing can be left hidden.
 * - Progress is kept in a `data-revealed` attribute rather than a class,
 *   because React rewrites `class` whenever a component's classes change.
 * - With reduced motion, or without IntersectionObserver, it does nothing and
 *   everything stays visible.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || !("MutationObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const seen = new WeakSet<Element>();
    const timers = new Set<number>();

    const settle = (el: HTMLElement) => {
      el.dataset.revealed = "done";
      el.style.removeProperty("--reveal-delay");
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        arriving.forEach((entry, index) => {
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          const step = Math.min(index, MAX_STEPS);
          if (step > 0 && !el.style.transitionDelay) el.style.setProperty("--reveal-delay", `calc(var(--stagger) * ${step})`);
          el.dataset.revealed = "in";
          // Once it has arrived, hand the element's transitions back to its own styles (hover lift and so on).
          const finish = () => {
            el.removeEventListener("transitionend", onEnd);
            window.clearTimeout(timer);
            timers.delete(timer);
            settle(el);
          };
          const onEnd = (event: TransitionEvent) => {
            if (event.target === el && event.propertyName === "opacity") finish();
          };
          el.addEventListener("transitionend", onEnd);
          const timer = window.setTimeout(finish, 1600);
          timers.add(timer);
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    const consider = (el: HTMLElement) => {
      if (seen.has(el) || el.dataset.revealed) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      const rendered = rect.width > 0 || rect.height > 0;
      if (rendered && rect.top < window.innerHeight && rect.bottom > 0) settle(el);
      else observer.observe(el);
    };
    const scan = (scope: Element | Document) => {
      if (scope instanceof HTMLElement && scope.classList.contains("reveal")) consider(scope);
      for (const el of scope.querySelectorAll<HTMLElement>(".reveal:not([data-revealed])")) consider(el);
    };

    // Mark what is already on screen first, then switch hiding on: no flicker.
    scan(document);
    root.classList.add("reveal-ready");

    // Runs before the next paint, so content added later never shows a hidden frame.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && (node.classList.contains("reveal") || node.querySelector(".reveal"))) scan(node);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      for (const timer of timers) window.clearTimeout(timer);
      root.classList.remove("reveal-ready");
    };
  }, []);
  return null;
}
