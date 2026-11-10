"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, useSyncExternalStore } from "react";
import { Icon } from "@/components/Icon";
import { cn } from "@/lib/cn";
import type { TocItem } from "@/lib/markdown";

/* ---------------- Reading progress ---------------- */

/** A thin bar showing how far through `#article-body` the reader is. */
export function ReadingProgress() {
  const [pct, setPct] = useState(0);
  useEffect(() => {
    const el = document.getElementById("article-body");
    if (!el) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      const total = rect.height - window.innerHeight * 0.6;
      const done = Math.min(Math.max(-rect.top + window.innerHeight * 0.25, 0), Math.max(total, 1));
      setPct(total > 0 ? (done / total) * 100 : 0);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 h-1" aria-hidden="true">
      <div className="h-full origin-left bg-tone-solid transition-[width] duration-100" style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ---------------- Table of contents ---------------- */

export function Toc({ items, className }: { items: TocItem[]; className?: string }) {
  const [active, setActive] = useState(items[0]?.id ?? "");
  useEffect(() => {
    const headings = items.map((i) => document.getElementById(i.id)).filter((el): el is HTMLElement => !!el);
    if (!headings.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-90px 0px -65% 0px", threshold: 0 },
    );
    headings.forEach((h) => io.observe(h));
    return () => io.disconnect();
  }, [items]);

  if (items.length < 2) return null;
  return (
    <nav aria-label="On this page" className={className}>
      <p className="eyebrow mb-3 text-ink-3">On this page</p>
      <ol className="space-y-0.5 border-l-[1.5px] border-line">
        {items.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className={cn(
                "-ml-[1.5px] block border-l-[2.5px] py-1.5 text-[0.875rem] leading-snug transition-colors",
                item.level === 3 ? "pl-6" : "pl-3.5",
                active === item.id ? "border-tone-solid font-semibold text-ink" : "border-transparent text-ink-3 hover:text-ink",
              )}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ol>
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
    toggle: (item: SavedItem) => write(items.some((i) => i.slug === item.slug) ? items.filter((i) => i.slug !== item.slug) : [item, ...items]),
    remove: (slug: string) => write(items.filter((i) => i.slug !== slug)),
  };
}

export function SaveButton({ item, className }: { item: SavedItem; className?: string }) {
  const { isSaved, toggle } = useSaved();
  const saved = isSaved(item.slug);
  return (
    <button type="button" className={cn("btn btn-sm", saved ? "btn-primary" : "btn-outline", className)} aria-pressed={saved} onClick={() => toggle(item)}>
      <Icon name="bookmark" size={15} fill={saved ? "currentColor" : "none"} />
      {saved ? "Saved" : "Save"}
    </button>
  );
}

export function ShareButton({ title, className }: { title: string; className?: string }) {
  const [copied, setCopied] = useState(false);
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
          setCopied(true);
          setTimeout(() => setCopied(false), 1800);
        } catch {
          /* cancelled or blocked */
        }
      }}
    >
      <Icon name={copied ? "check" : "share"} size={15} />
      <span aria-live="polite">{copied ? "Link copied" : "Share"}</span>
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
