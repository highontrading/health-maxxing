"use client";

import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { stagger } from "@/components/motion/stagger";
import { cn } from "@/lib/cn";
import type { TocItem } from "@/lib/markdown";

/* The motion for everything in this file is in `src/app/styles/motion/reading.css`. */

/* ---------------- Reading progress ---------------- */

/**
 * A thin bar showing how far through `#article-body` the reader is. The
 * article is measured when the page changes size, not while it scrolls: a
 * scroll only reads the scroll position and sets one transform, so it costs
 * no layout and no re-render.
 */
export function ReadingProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const fill = bar.current;
    // Look inside this page only: the page before it may still be in the document, hidden.
    const el = fill?.closest("main")?.querySelector<HTMLElement>("#article-body");
    if (!fill || !el) return;
    let top = 0;
    let height = 0;
    let frame = 0;
    const paint = () => {
      frame = 0;
      const total = height - window.innerHeight * 0.6;
      const done = Math.min(Math.max(window.scrollY - top + window.innerHeight * 0.25, 0), Math.max(total, 1));
      fill.style.scale = `${total > 0 ? done / total : 0} 1`;
    };
    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const measure = () => {
      const rect = el.getBoundingClientRect();
      top = rect.top + window.scrollY;
      height = rect.height;
      schedule();
    };
    measure();
    // The article reflows (fonts, a narrower window), or something above it opens and moves it down.
    const sizes = new ResizeObserver(measure);
    sizes.observe(el);
    sizes.observe(document.body);
    window.addEventListener("scroll", schedule, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      sizes.disconnect();
      window.removeEventListener("scroll", schedule);
      window.removeEventListener("resize", measure);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="reading-progress pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden="true">
      <div ref={bar} className="reading-progress-bar h-full bg-tone-solid" />
    </div>
  );
}

/* ---------------- Table of contents ---------------- */

export function Toc({ items, className }: { items: TocItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  const list = useRef<HTMLDivElement>(null);

  // The section being read is the last heading that has passed a line about a third of the way down the
  // screen. The observer only says when a heading crosses that line; positions are read then, not on scroll.
  useEffect(() => {
    // Look inside this page only: the page before it may still be in the document, with the same ids.
    const scope: ParentNode = list.current?.closest("main") ?? document;
    const headings = items.map((i) => scope.querySelector<HTMLElement>(`#${CSS.escape(i.id)}`)).filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const io = new IntersectionObserver(
      () => {
        const line = window.innerHeight * 0.35;
        let current = headings[0];
        for (const heading of headings) {
          if (heading.getBoundingClientRect().top <= line) current = heading;
        }
        setActive(current.id);
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  // Slide the marker to the active link. Links wrap to different heights, so its place is measured.
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const place = () => {
      const link = el.querySelector<HTMLElement>('a[data-active="true"]');
      if (!link || !link.offsetHeight) {
        // Nothing to point at, or the list is not displayed (a narrow screen): the link shows the bar itself.
        el.removeAttribute("data-marker");
        return;
      }
      el.style.setProperty("--toc-y", String(link.offsetTop));
      el.style.setProperty("--toc-h", String(link.offsetHeight));
      el.dataset.marker = "on";
    };
    place();
    const sizes = new ResizeObserver(place);
    sizes.observe(el);
    return () => sizes.disconnect();
  }, [active]);

  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className={className}>
      <p className="eyebrow mb-3 text-ink-3">On this page</p>
      <div ref={list} className="toc-list">
        <ol className="space-y-0.5 border-l-[1.5px] border-line">
          {items.map((item) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-active={active === item.id}
                className={cn(
                  "toc-link -ml-[1.5px] block py-1.5 text-[0.875rem] leading-snug",
                  item.level === 3 ? "pl-6" : "pl-3.5",
                  active === item.id ? "font-semibold text-ink" : "text-ink-3 hover:text-ink",
                )}
              >
                {item.text}
              </a>
            </li>
          ))}
        </ol>
        <span className="toc-marker" aria-hidden="true" />
      </div>
    </nav>
  );
}

/* ---------------- Saved reads (localStorage) ---------------- */

export type SavedItem = { slug: string; title: string; category: string; sticker: string; color: string; minutes: number };
const KEY = "hm:saved";
const EVENT = "hm:saved-change";

function readSaved(): SavedItem[] {
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
let cache: { raw: string | null; value: SavedItem[] } = { raw: null, value: [] };
function snapshot(): SavedItem[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    /* storage unavailable */
  }
  if (raw !== cache.raw) cache = { raw, value: readSaved() };
  return cache.value;
}
const EMPTY_SAVED: SavedItem[] = [];
function subscribe(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

export function useSaved() {
  const items = useSyncExternalStore(subscribe, snapshot, () => EMPTY_SAVED);
  const write = (next: SavedItem[]) => {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next.slice(0, 200)));
    } catch {
      /* storage full or blocked */
    }
    window.dispatchEvent(new Event(EVENT));
  };
  return {
    items,
    isSaved: (slug: string) => items.some((i) => i.slug === slug),
    // Both change the list as it is now, not as it was at the last render: a row is removed a moment
    // after the click (SavedList), and must not undo whatever changed in between.
    toggle: (item: SavedItem) => {
      const now = snapshot();
      write(now.some((i) => i.slug === item.slug) ? now.filter((i) => i.slug !== item.slug) : [item, ...now]);
    },
    remove: (slug: string) => write(snapshot().filter((i) => i.slug !== slug)),
  };
}

export function SaveButton({ item, className }: { item: SavedItem; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(item.slug);
  // Clicks so far, and how many of them saved. The bookmark bumps for a click that saves and the
  // label fades for any click, but never on load, when a returning reader's "Saved" simply appears.
  const [clicks, setClicks] = useState({ any: false, saves: 0 });
  return (
    <button
      type="button"
      className={cn("btn btn-sm", saved ? "btn-primary" : "btn-outline", className)}
      aria-pressed={saved}
      onClick={() => {
        setClicks((c) => ({ any: true, saves: saved ? c.saves : c.saves + 1 }));
        toggle(item);
      }}
    >
      {/* A new key replays the bump. */}
      <span key={clicks.saves} className={cn("flex", clicks.saves > 0 && "bump")}>
        <Icon name="bookmark" size={15} fill="currentColor" className="save-icon" style={{ fillOpacity: saved ? 1 : 0 }} />
      </span>
      {/* data-reserve holds the button at the width of the longer wording. */}
      <span className="save-label" data-reserve="Saved">
        <span key={saved ? "saved" : "save"} className={clicks.any ? "reading-swap-in" : undefined}>
          {saved ? "Saved" : "Save"}
        </span>
      </span>
    </button>
  );
}

export function ShareButton({ title, className }: { title: string; className?: string }) {
  // "idle" until the link has been copied once, so nothing moves on load; then "copied" and back to "ready".
  const [state, setState] = useState<"idle" | "copied" | "ready">("idle");
  const reset = useRef<number | undefined>(undefined);
  const copied = state === "copied";
  const used = state !== "idle";
  return (
    <button
      type="button"
      className={cn("btn btn-outline btn-sm", className)}
      onClick={async () => {
        const url = window.location.href.split("#")[0];
        try {
          if (navigator.share && window.matchMedia("(pointer: coarse)").matches) {
            await navigator.share({ title, url });
            return;
          }
          await navigator.clipboard.writeText(url);
          setState("copied");
          // A second click restarts the wait instead of cutting the message short.
          window.clearTimeout(reset.current);
          reset.current = window.setTimeout(() => setState("ready"), 1800);
        } catch {
          /* cancelled or blocked */
        }
      }}
    >
      {/* The tick pops in; the share icon fades back. stagger(0): it answers a click, so it never waits its turn. */}
      <span key={copied ? "copied" : "share"} className={cn("flex", used && (copied ? "enter-pop" : "reading-swap-in"))} style={stagger(0)}>
        <Icon name={copied ? "check" : "share"} size={15} />
      </span>
      {/* The live region stays; only the wording inside it is replaced, which is what gets announced. */}
      <span aria-live="polite">
        <span key={copied ? "copied" : "share"} className={used ? "reading-swap-in" : undefined}>
          {copied ? "Link copied" : "Share"}
        </span>
      </span>
    </button>
  );
}

/* ---------------- View tracking ---------------- */

/** Counts one view per browser session per page. Sends nothing identifying. */
export function ViewTracker({ kind, slug }: { kind: "article" | "condition"; slug: string }) {
  useEffect(() => {
    const key = `hm:v:${kind}:${slug}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    const body = JSON.stringify({ kind, slug });
    const timer = setTimeout(() => {
      fetch("/api/track", { method: "POST", body, headers: { "Content-Type": "application/json" }, keepalive: true }).catch(() => {});
    }, 4000);
    return () => clearTimeout(timer);
  }, [kind, slug]);
  return null;
}

/* ---------------- In-prose link routing ---------------- */

/**
 * Article bodies are rendered HTML, so their internal links are plain anchors.
 * This routes clicks on them through the Next.js router instead of a full reload.
 */
export function ProseLinkRouter() {
  const router = useRouter();
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || !a.closest("[data-prose]")) return;
      const href = a.getAttribute("href") ?? "";
      if (!href.startsWith("/") || href.startsWith("//") || a.target === "_blank") return;
      e.preventDefault();
      router.push(href);
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [router]);
  return null;
}
