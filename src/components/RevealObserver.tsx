"use client";

import { useEffect } from "react";

/** Elements that arrive together cascade; after this many steps they simply arrive together. */
const MAX_STEPS = 6;

/**
 * Where each kind of reveal starts from. `offset: 0` matters: a lone keyframe
 * without it is read as the END of the animation. With it, the animation runs
 * from here to the element's own style.
 */
function startOf(el: Element): Keyframe {
  if (el.classList.contains("reveal-fade")) return { offset: 0, opacity: 0 };
  if (el.classList.contains("reveal-pop")) return { offset: 0, opacity: 0, scale: 0.8 };
  if (el.classList.contains("reveal-left")) return { offset: 0, opacity: 0, translate: "-16px 0" };
  if (el.classList.contains("reveal-right")) return { offset: 0, opacity: 0, translate: "16px 0" };
  return { offset: 0, opacity: 0, translate: "0 16px" };
}

/** "520ms" or "0.52s" to milliseconds. */
function toMs(value: string, fallback: number): number {
  const n = parseFloat(value);
  if (Number.isNaN(n)) return fallback;
  return value.trim().endsWith("ms") ? n : n * 1000;
}

/**
 * Shows `.reveal` elements as they scroll into view. Mounted once in the site
 * layout. Add `reveal` to an element below the fold; modifiers are
 * `reveal-fade`, `reveal-pop`, `reveal-left` and `reveal-right`; order
 * siblings with `style={stagger(i)}`.
 *
 * How it stays safe:
 * - It works through the Web Animations API and never changes an element's
 *   class, style or attributes. React owns those, and rewrites or checks them
 *   when a component updates or hydrates.
 * - An element is hidden only by an animation this component is holding, so
 *   nothing can be left hidden: without JavaScript, with reduced motion or
 *   without IntersectionObserver everything is simply visible.
 * - An element that is already on screen when it is found is left alone. That
 *   covers the first screen of every page, including one that has just opened
 *   through a page transition.
 * - New content is picked up whenever it is added to the page (a page change,
 *   a section that streams in, a filtered list), not only when the address
 *   changes.
 */
export function RevealObserver() {
  useEffect(() => {
    if (!("IntersectionObserver" in window) || !("MutationObserver" in window) || !("animate" in Element.prototype)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const tokens = getComputedStyle(document.documentElement);
    const duration = toMs(tokens.getPropertyValue("--dur-slower"), 520);
    const step = toMs(tokens.getPropertyValue("--stagger"), 45);
    const easeEnter = tokens.getPropertyValue("--ease-enter").trim() || "ease-out";
    const easePop = tokens.getPropertyValue("--ease-pop").trim() || easeEnter;

    const seen = new WeakSet<Element>();
    /** Elements that are hidden and waiting, each with the paused animation that hides it. */
    const waiting = new Map<Element, Animation>();

    const release = (el: Element) => {
      const animation = waiting.get(el);
      waiting.delete(el);
      animation?.cancel();
    };

    const observer = new IntersectionObserver(
      (entries) => {
        const arriving = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left);
        arriving.forEach((entry, index) => {
          const el = entry.target as HTMLElement;
          observer.unobserve(el);
          const animation = waiting.get(el);
          if (!animation) return;
          waiting.delete(el);
          // Its own order (--i) or delay wins; otherwise a batch cascades.
          const own = el.style.getPropertyValue("--i");
          const delay = own ? Number(own) * step : el.style.transitionDelay ? toMs(el.style.transitionDelay, 0) : Math.min(index, MAX_STEPS) * step;
          animation.effect?.updateTiming({ delay });
          animation.play();
          // When it has arrived, let go, so the element's own hover and focus styles apply again.
          animation.finished.then(() => animation.cancel()).catch(() => {});
        });
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0 },
    );

    const consider = (el: HTMLElement) => {
      if (seen.has(el)) return;
      seen.add(el);
      const rect = el.getBoundingClientRect();
      const onScreen = (rect.width > 0 || rect.height > 0) && rect.top < window.innerHeight && rect.bottom > 0;
      if (onScreen) return;
      const animation = el.animate([startOf(el)], { duration, easing: el.classList.contains("reveal-pop") ? easePop : easeEnter, fill: "both" });
      animation.pause();
      waiting.set(el, animation);
      observer.observe(el);
    };
    const scan = (scope: Element | Document) => {
      if (scope instanceof HTMLElement && scope.classList.contains("reveal")) consider(scope);
      for (const el of scope.querySelectorAll<HTMLElement>(".reveal")) consider(el);
    };

    scan(document);

    // Mutation callbacks run before the next paint, so content added later is
    // dealt with before anyone can see it.
    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        for (const node of record.addedNodes) {
          if (node instanceof HTMLElement && (node.classList.contains("reveal") || node.querySelector(".reveal"))) scan(node);
        }
      }
      // Forget elements that have left the page.
      for (const el of waiting.keys()) {
        if (!el.isConnected) {
          observer.unobserve(el);
          release(el);
        }
      }
    });
    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      // Leave nothing hidden behind.
      for (const el of [...waiting.keys()]) release(el);
    };
  }, []);
  return null;
}
