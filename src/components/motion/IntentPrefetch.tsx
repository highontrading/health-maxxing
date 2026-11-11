"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Pages whose content depends on the address (an article, a condition, a
 * tool). A normal prefetch brings only their loading skeleton, so they open
 * in two steps. The rest of the site is either already fetched whole, or
 * rendered per visitor and not worth fetching early.
 */
const CONTENT_PAGE = /^\/(?:articles|conditions|topics|exercises|foods|tools|body)\/[^/]+\/?$|^\/newsletter\/(?!unsubscribe)[^/]+\/?$/;
/** One-segment addresses are editable pages (/about, /privacy) unless they are one of these routes. */
const SINGLE_SEGMENT = /^\/([a-z0-9-]+)\/?$/;
const RESERVED = new Set([
  "account", "admin", "api", "articles", "body", "community", "conditions", "contact", "exercises", "foods", "forgot-password", "glossary",
  "login", "media", "myths", "newsletter", "reset-password", "saved", "search", "signup", "stickers", "tools", "topics",
]);

const FRESH_MS = 60_000;
const DWELL_MS = 60;
/** Touch screens: how many pages may be fetched ahead per page view, and how many each time scrolling settles. */
const TOUCH_BUDGET = 6;
const TOUCH_BATCH = 2;
const SETTLE_MS = 400;

function wantsFullPrefetch(pathname: string): boolean {
  if (CONTENT_PAGE.test(pathname)) return true;
  const single = SINGLE_SEGMENT.exec(pathname);
  return single !== null && !RESERVED.has(single[1]);
}

/**
 * Fetches the whole page when a visitor shows they are about to open it
 * (a pointer resting on a link, or keyboard focus), so the page change goes
 * straight from the old page to the new one. Without this the visitor sees
 * the old page, a pause, then the content.
 *
 * A touch screen has no hover, and a finger landing on a link is usually the
 * start of a scroll, not a tap. So there it fetches the one or two content
 * pages whose links are nearest the middle of the screen each time scrolling
 * settles, up to a small budget per page.
 *
 * Mounted once in the site layout; it works for every link, including the
 * ones inside article text. It does nothing when the visitor has asked to
 * save data.
 */
export function IntentPrefetch() {
  const router = useRouter();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection;
    if (connection?.saveData) return;

    const fetched = new Map<string, number>();
    let timer: ReturnType<typeof setTimeout> | undefined;

    const linkOf = (event: Event): HTMLAnchorElement | null => {
      const el = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(el instanceof HTMLAnchorElement)) return null;
      if (el.origin !== window.location.origin || el.target === "_blank" || el.hasAttribute("download")) return null;
      if (el.pathname === window.location.pathname) return null;
      return wantsFullPrefetch(el.pathname) ? el : null;
    };
    /** Returns false when the page was fetched a moment ago. */
    const prefetch = (link: HTMLAnchorElement): boolean => {
      const key = link.pathname;
      const now = performance.now();
      const last = fetched.get(key);
      if (last !== undefined && now - last < FRESH_MS) return false;
      fetched.set(key, now);
      // `kind: "full"` is what <Link prefetch> uses. The router falls back to
      // its normal prefetch if a future version stops recognising the value.
      router.prefetch(key, { kind: "full" } as Parameters<typeof router.prefetch>[1]);
      return true;
    };
    const onPointerOver = (event: PointerEvent) => {
      clearTimeout(timer);
      if (event.pointerType === "touch") return;
      const link = linkOf(event);
      if (link) timer = setTimeout(() => prefetch(link), DWELL_MS);
    };
    const onIntent = (event: Event) => {
      const link = linkOf(event);
      if (link) prefetch(link);
    };

    // Touch screens: look ahead a little whenever scrolling settles.
    const touchFirst = window.matchMedia("(hover: none)").matches && !/(^|-)2g$/.test(connection?.effectiveType ?? "");
    let settle: ReturnType<typeof setTimeout> | undefined;
    let budget = TOUCH_BUDGET;
    let budgetFor = window.location.pathname;
    const lookAhead = () => {
      if (budgetFor !== window.location.pathname) {
        budgetFor = window.location.pathname;
        budget = TOUCH_BUDGET;
      }
      if (budget <= 0) return;
      const height = window.innerHeight;
      const candidates: { link: HTMLAnchorElement; distance: number }[] = [];
      for (const link of document.querySelectorAll<HTMLAnchorElement>("a[href]")) {
        if (link.origin !== window.location.origin || link.pathname === window.location.pathname || !wantsFullPrefetch(link.pathname)) continue;
        const rect = link.getBoundingClientRect();
        if (rect.width === 0 || rect.bottom < height * 0.1 || rect.top > height * 0.9) continue;
        candidates.push({ link, distance: Math.abs((rect.top + rect.bottom) / 2 - height / 2) });
      }
      candidates.sort((a, b) => a.distance - b.distance);
      let batch = TOUCH_BATCH;
      for (const { link } of candidates) {
        if (batch === 0 || budget === 0) break;
        if (prefetch(link)) {
          batch -= 1;
          budget -= 1;
        }
      }
    };
    const onScroll = () => {
      clearTimeout(settle);
      settle = setTimeout(lookAhead, SETTLE_MS);
    };

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onIntent);
    if (touchFirst) {
      window.addEventListener("scroll", onScroll, { passive: true });
      settle = setTimeout(lookAhead, 1200);
    }
    return () => {
      clearTimeout(timer);
      clearTimeout(settle);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onIntent);
      window.removeEventListener("scroll", onScroll);
    };
  }, [router]);
  return null;
}
