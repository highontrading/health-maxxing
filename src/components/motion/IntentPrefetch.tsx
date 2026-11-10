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

function wantsFullPrefetch(pathname: string): boolean {
  if (CONTENT_PAGE.test(pathname)) return true;
  const single = SINGLE_SEGMENT.exec(pathname);
  return single !== null && !RESERVED.has(single[1]);
}

/**
 * Fetches the whole page when a visitor shows they are about to open it
 * (pointer resting on a link, keyboard focus, or a finger touching it), so the
 * page change goes straight from the old page to the new one. Without this
 * the visitor sees old page, skeleton, then content. Mounted once in the site
 * layout; it works for every link, including the ones inside article text.
 */
export function IntentPrefetch() {
  const router = useRouter();
  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
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
    const prefetch = (link: HTMLAnchorElement) => {
      const key = link.pathname;
      const now = performance.now();
      const last = fetched.get(key);
      if (last !== undefined && now - last < FRESH_MS) return;
      fetched.set(key, now);
      // `kind: "full"` is what <Link prefetch> uses. The router falls back to
      // its normal prefetch if a future version stops recognising the value.
      router.prefetch(key, { kind: "full" } as Parameters<typeof router.prefetch>[1]);
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

    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("focusin", onIntent);
    document.addEventListener("touchstart", onIntent, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("focusin", onIntent);
      document.removeEventListener("touchstart", onIntent);
    };
  }, [router]);
  return null;
}
