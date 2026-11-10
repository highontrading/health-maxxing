"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

export type NavCategory = { slug: string; name: string; tagline: string; sticker: string; color: string };

export const PRIMARY_LINKS = [
  { href: "/conditions", label: "Conditions" },
  { href: "/body", label: "Body map" },
  { href: "/tools", label: "Tools" },
  { href: "/exercises", label: "Exercises" },
  { href: "/foods", label: "Foods" },
  { href: "/community", label: "Community" },
];

const MORE_LINKS = [
  { href: "/articles", label: "All articles", sticker: "magnifier" },
  { href: "/myths", label: "Myth or fact", sticker: "cross" },
  { href: "/glossary", label: "Glossary", sticker: "chat" },
  { href: "/newsletter", label: "Newsletter", sticker: "mail" },
];

function useDismiss(open: boolean, close: () => void, ref: React.RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, ref]);
}

/* ------------------------------------------------------------------ */
/* Desktop navigation                                                  */
/* ------------------------------------------------------------------ */

export function DesktopNav({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const panelId = useId();
  useDismiss(open, close, wrap);
  useEffect(() => setOpen(false), [pathname]);

  const linkClass = (active: boolean) =>
    cn(
      "rounded-full px-3 py-2 text-[0.9375rem] font-medium transition-colors",
      active ? "bg-ink text-paper" : "text-ink-2 hover:bg-sand-2 hover:text-ink",
    );
  const topicsActive = pathname.startsWith("/topics") || pathname.startsWith("/articles");

  return (
    <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      <div ref={wrap} className="relative">
        <button
          type="button"
          className={cn(linkClass(topicsActive), "inline-flex items-center gap-1")}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpen((v) => !v)}
        >
          Topics
          <Icon name="chevron-down" size={16} className={cn("transition-transform", open && "rotate-180")} />
        </button>
        {open && (
          <div
            id={panelId}
            className="absolute left-0 top-[calc(100%+12px)] z-50 w-[min(820px,92vw)] rounded-[26px] border border-line bg-paper p-4 shadow-pop"
            style={{ animation: "rise 0.18s ease both" }}
          >
            <div className="grid grid-cols-[1fr_210px] gap-4">
              <ul className="grid grid-cols-2 gap-1">
                {categories.map((c) => (
                  <li key={c.slug}>
                    <Link
                      href={`/topics/${c.slug}`}
                      className={cn(`tone-${c.color}`, "group flex items-center gap-3 rounded-2xl p-2 transition-colors hover:bg-tone-soft")}
                    >
                      <Sticker name={c.sticker} size={38} flat className="transition-transform group-hover:-rotate-6 group-hover:scale-110" />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-semibold leading-tight">{c.name}</span>
                        <span className="block truncate text-xs text-ink-3">{c.tagline}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="rounded-2xl bg-sand p-3">
                <p className="eyebrow px-2 pb-2 pt-1 text-ink-3">Also here</p>
                <ul>
                  {MORE_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="flex items-center gap-2.5 rounded-xl p-2 text-[0.9375rem] font-medium hover:bg-paper">
                        <Sticker name={l.sticker} size={26} flat />
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>
      {PRIMARY_LINKS.map((l) => (
        <Link key={l.href} href={l.href} className={linkClass(pathname === l.href || pathname.startsWith(l.href + "/"))}>
          {l.label}
        </Link>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Mobile menu                                                         */
/* ------------------------------------------------------------------ */

export function MobileMenu({ categories }: { categories: NavCategory[] }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-sand-2 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Icon name={open ? "close" : "menu"} size={24} />
      </button>
      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[var(--header-h)] z-50 overflow-y-auto overscroll-contain bg-sand lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <div className="container-hm py-6">
            <ul className="grid gap-1">
              {[{ href: "/articles", label: "All articles" }, ...PRIMARY_LINKS, { href: "/myths", label: "Myth or fact" }, { href: "/glossary", label: "Glossary" }].map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center justify-between rounded-2xl bg-paper px-4 py-3.5 text-lg font-medium">
                    {l.label}
                    <Icon name="arrow-right" size={18} className="text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="eyebrow mt-8 text-ink-3">Topics</p>
            <ul className="mt-3 grid grid-cols-2 gap-2">
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/topics/${c.slug}`} className={cn(`tone-${c.color}`, "flex items-center gap-2.5 rounded-2xl bg-tone-soft p-3 text-[0.9375rem] font-semibold leading-tight text-tone-ink")}>
                    <Sticker name={c.sticker} size={32} flat />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-8 grid grid-cols-2 gap-2">
              <Link href="/login" className="btn btn-outline">Sign in</Link>
              <Link href="/newsletter" className="btn btn-primary">Subscribe</Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Account                                                             */
/* ------------------------------------------------------------------ */

type Me = { name: string; handle: string; role: string; sticker: string; color: string } | null;

export function AccountButton() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrap);

  useEffect(() => {
    let alive = true;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => alive && setMe(d.user ?? null))
      .catch(() => alive && setMe(null));
    return () => {
      alive = false;
    };
  }, [pathname]);
  useEffect(() => setOpen(false), [pathname]);

  if (me === undefined) return <span className="hidden size-10 rounded-full bg-sand-2 sm:block" aria-hidden />;
  if (me === null) {
    return (
      <Link href="/login" className="btn btn-ghost btn-sm hidden sm:inline-flex">
        Sign in
      </Link>
    );
  }
  const staff = me.role === "admin" || me.role === "editor";
  return (
    <div ref={wrap} className="relative">
      <button
        type="button"
        className={cn(`tone-${me.color}`, "flex size-10 items-center justify-center rounded-full bg-tone-soft ring-2 ring-transparent transition hover:ring-ink")}
        aria-label={`Account menu for ${me.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Sticker name={me.sticker} size={28} flat />
      </button>
      {open && (
        <div className="absolute right-0 top-[calc(100%+10px)] z-50 w-60 rounded-3xl border border-line bg-paper p-2 shadow-pop" style={{ animation: "rise 0.18s ease both" }}>
          <div className="px-3 pb-2 pt-2">
            <p className="truncate font-semibold leading-tight">{me.name}</p>
            <p className="truncate text-sm text-ink-3">@{me.handle}</p>
          </div>
          <div className="dotted-rule mx-2 my-1" />
          <Link href="/account" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.9375rem] font-medium hover:bg-sand">
            <Icon name="user" size={18} /> My account
          </Link>
          <Link href="/saved" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.9375rem] font-medium hover:bg-sand">
            <Icon name="bookmark" size={18} /> Saved reads
          </Link>
          {staff && (
            <Link href="/admin" className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.9375rem] font-medium hover:bg-sand">
              <Icon name="settings" size={18} /> Admin panel
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[0.9375rem] font-medium hover:bg-sand">
              <Icon name="logout" size={18} /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Search                                                              */
/* ------------------------------------------------------------------ */

type Hit = { type: string; slug: string; href: string; title: string; summary: string; category: string; sticker: string };

export const TYPE_LABEL: Record<string, string> = {
  article: "Article",
  condition: "Condition",
  tool: "Tool",
  topic: "Topic",
  term: "Glossary",
  myth: "Myth or fact",
  food: "Food",
  exercise: "Exercise",
};
const TYPE_STICKER: Record<string, string> = {
  condition: "stethoscope",
  term: "chat",
  food: "apple",
  exercise: "dumbbell",
  tool: "tape",
  myth: "cross",
};

export function useSearch(query: string) {
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setHits([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => {
          setHits(d.hits ?? []);
          setLoading(false);
        })
        .catch((err) => {
          if (err?.name !== "AbortError") setLoading(false);
        });
    }, 140);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [query]);
  return { hits, loading };
}

export function SearchHitRow({ hit, colorOf, active, onNavigate }: { hit: Hit; colorOf: Record<string, string>; active?: boolean; onNavigate?: () => void }) {
  const color = colorOf[hit.category] ?? "sand";
  return (
    <Link
      href={hit.href}
      onClick={onNavigate}
      className={cn(`tone-${color}`, "group flex items-start gap-3 rounded-2xl p-2.5 transition-colors hover:bg-sand", active && "bg-sand")}
    >
      <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-tone-soft">
        <Sticker name={hit.sticker || TYPE_STICKER[hit.type] || "magnifier"} size={30} flat />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold leading-snug">{hit.title}</span>
          <span className="eyebrow flex-none text-ink-3">{TYPE_LABEL[hit.type] ?? hit.type}</span>
        </span>
        <span className="line-clamp-1 text-sm text-ink-3">{hit.summary}</span>
      </span>
    </Link>
  );
}

const SUGGESTIONS = ["protein", "sleep", "blood pressure", "anxiety", "back pain", "creatine", "bmi", "migraine"];

export function SearchButton({ colorOf }: { colorOf: Record<string, string> }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const pathname = usePathname();
  const { hits, loading } = useSearch(query);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => setCursor(0), [query]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "") || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => {
      document.body.style.overflow = prev;
      clearTimeout(t);
    };
  }, [open]);

  const visible = hits.slice(0, 8);
  const go = (q: string) => {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <button
        type="button"
        className="inline-flex size-11 items-center justify-center rounded-full hover:bg-sand-2"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Icon name="search" size={22} />
      </button>
      {open && (
        <div className="fixed inset-0 z-[60] flex items-start justify-center bg-ink/40 p-3 pt-[8vh] backdrop-blur-sm" onPointerDown={(e) => e.target === e.currentTarget && setOpen(false)}>
          <div role="dialog" aria-modal="true" aria-label="Search" className="w-full max-w-2xl overflow-hidden rounded-[28px] bg-paper shadow-pop" style={{ animation: "rise 0.2s ease both" }}>
            <form
              className="flex items-center gap-3 border-b border-line px-5"
              onSubmit={(e) => {
                e.preventDefault();
                const hit = visible[cursor];
                if (hit && query.trim().length >= 2) {
                  setOpen(false);
                  router.push(hit.href);
                } else if (query.trim()) go(query.trim());
              }}
            >
              <Icon name="search" size={22} className="flex-none text-ink-3" />
              <input
                ref={input}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setCursor((c) => Math.min(c + 1, Math.max(visible.length - 1, 0)));
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setCursor((c) => Math.max(c - 1, 0));
                  }
                }}
                placeholder="Search articles, conditions, tools…"
                className="h-16 min-w-0 flex-1 bg-transparent text-lg outline-none placeholder:text-ink-3"
                aria-label="Search the site"
                autoComplete="off"
                enterKeyHint="search"
              />
              <button type="button" className="eyebrow flex-none rounded-md border border-line-strong px-2 py-1.5 text-ink-3 hover:bg-sand" onClick={() => setOpen(false)}>
                Esc
              </button>
            </form>
            <div className="max-h-[60vh] overflow-y-auto p-2.5">
              {query.trim().length < 2 ? (
                <div className="p-3">
                  <p className="eyebrow text-ink-3">Try</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="chip chip-outline hover:border-ink hover:text-ink" onClick={() => setQuery(s)}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              ) : visible.length ? (
                <>
                  <ul>
                    {visible.map((hit, i) => (
                      <li key={hit.type + hit.slug} onPointerEnter={() => setCursor(i)}>
                        <SearchHitRow hit={hit} colorOf={colorOf} active={i === cursor} onNavigate={() => setOpen(false)} />
                      </li>
                    ))}
                  </ul>
                  {hits.length > visible.length && (
                    <button type="button" className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-sm font-semibold hover:bg-sand" onClick={() => go(query.trim())}>
                      See all {hits.length} results <Icon name="arrow-right" size={16} />
                    </button>
                  )}
                </>
              ) : (
                <p className="p-6 text-center text-ink-3">{loading ? "Searching…" : `Nothing for "${query.trim()}" yet. Try a broader word.`}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
