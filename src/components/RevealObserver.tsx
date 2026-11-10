"use client";

import { useEffect } from "react";

/** Elements that arrive together cascade; after this many steps they simply arrive together. */
const MAX_STEPS = 6;

/**
 * Shows `.reveal` elements as they scroll into view (the classes are in
 * `src/app/styles/motion/utilities.css`). Mounted once in the site layout.
 *
 * - An element is hidden only after this component has started watching it
 *   ("armed"), so nothing can be left hidden: without JavaScript, with reduced
 *   motion or without IntersectionObserver everything is simply visible.
 * - An element that is already on screen when it is found is left as it is,
 *   with no animation. That covers the first screen of every page, including a
 *   page that has just opened through a page transition.
 * - New content is picked up whenever it is added to the page (a page change,
 *   a section that streams in, a filtered list), not only when the address
 *   changes.
 * - Progress is kept in a `data-reveal` attribute rather than a class, because
 *   React rewrites `class` whenever a component's classes change.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || !("MutationObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timers = new Set<number>();
    const settle = (el: HTMLElement) => {
      el.dataset.reveal = "done";
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
          // Cascade a batch, unless the element sets its own order (--i) or delay.
          const step = Math.min(index, MAX_STEPS);
          if (step > 0 && !el.style.transitionDelay && !el.style.getPropertyValue("--i")) {
            el.style.setProperty("--reveal-delay", `calc(var(--stagger) * ${step})`);
          }
          el.dataset.reveal = "in";
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
      if (el.dataset.reveal) return;
      const rect = el.getBoundingClientRect();
      const onScreen = (rect.width > 0 || rect.height > 0) && rect.top < window.innerHeight && rect.bottom > 0;
      if (onScreen) {
        settle(el);
      } else {
        el.dataset.reveal = "armed";
        observer.observe(el);
      }
    };
    const scan = (scope: Element | Document) => {
      if (scope instanceof HTMLElement && scope.classList.contains("reveal")) consider(scope);
      for (const el of scope.querySelectorAll<HTMLElement>(".reveal:not([data-reveal])")) consider(el);
    };

    scan(document);

    // Mutation callbacks run before the next paint, so content added later is
    // armed (or left alone) before anyone can see it.
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
      // Leave nothing hidden behind.
      for (const el of document.querySelectorAll<HTMLElement>('.reveal[data-reveal="armed"], .reveal[data-reveal="in"]')) settle(el);
    };
  }, []);
  return null;
}
