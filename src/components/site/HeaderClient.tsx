"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Suspense, useCallback, useEffect, useId, useLayoutEffect, useRef, useState, type CSSProperties, type MouseEvent, type RefObject } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";
import { MenuToggleIcon } from "@/components/motion/MenuToggleIcon";
import { usePresence } from "@/components/motion/presence";
import { useScrollLock } from "@/components/motion/scroll-lock";
import { Spinner } from "@/components/motion/Spinner";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { SEARCH_TYPE_LABEL } from "@/lib/labels";

export type NavCategory = { slug: string; name: string; tagline: string; sticker: string; color: string };

const PRIMARY_LINKS = [
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

/* ------------------------------------------------------------------ */
/* Layers: the menus, the phone sheet and the search dialog            */
/* ------------------------------------------------------------------ */

/** A closing layer stays mounted this long: just past its exit animation (--dur-fast). */
const EXIT_MS = 140;

/** The corner a menu grows from (read by `motion-menu`). */
const FROM_TOP_LEFT = { "--origin": "top left" } as CSSProperties;
const FROM_TOP_RIGHT = { "--origin": "top right" } as CSSProperties;

/** Keeps a layer mounted while it animates out. With reduced motion there is no exit to wait for. */
function useLayer(open: boolean) {
  const reduced = useReducedMotion();
  return usePresence(open, reduced ? 0 : EXIT_MS);
}

/**
 * Gives keyboard focus back to the control that opened a layer, unless the visitor has already
 * moved it to something outside the layer. `preventScroll` matters: the header is sticky and sits
 * inside the page's scroll padding, so a plain focus() would scroll a long page back to the top.
 */
function returnFocus(trigger: HTMLElement | null, layer: HTMLElement | null) {
  const active = document.activeElement;
  if (!active || active === document.body || layer?.contains(active)) trigger?.focus({ preventScroll: true });
}

/** True when a click inside a layer followed a link, so the layer can close at once (also when the link leads to the page already open). */
const followedLink = (e: MouseEvent) => (e.target as Element).closest("a") !== null;

/** True when that link leads to the page already open, so no page change will come to close the layer. */
const followedLinkToThisPage = (e: MouseEvent) => {
  const link = (e.target as Element).closest("a");
  return link !== null && link.pathname === window.location.pathname;
};

/**
 * Closes a menu on Escape and on a press outside `wrap`, the element that holds the trigger and
 * the menu. Escape also hands focus back to the trigger.
 */
function useDismiss(open: boolean, close: () => void, wrap: RefObject<HTMLElement | null>, trigger: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      returnFocus(trigger.current, wrap.current);
      close();
    };
    const onDown = (e: PointerEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) close();
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open, close, wrap, trigger]);
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Keeps the Tab key inside an open modal layer (plus its trigger, when the trigger stays on screen
 * as the way to close it). Without this, focus walks on into the page behind the layer.
 */
function useFocusTrap(open: boolean, layer: RefObject<HTMLElement | null>, trigger?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !layer.current) return;
      const stops = [...(trigger?.current ? [trigger.current] : []), ...layer.current.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => el.getClientRects().length > 0);
      if (stops.length === 0) return;
      const first = stops[0];
      const last = stops[stops.length - 1];
      const at = document.activeElement;
      if (!stops.includes(at as HTMLElement)) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
      } else if (!e.shiftKey && at === last) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && at === first) {
        e.preventDefault();
        last.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, layer, trigger]);
}

function PathReader({ onChange }: { onChange: (pathname: string) => void }) {
  const pathname = usePathname();
  useEffect(() => onChange(pathname), [pathname, onChange]);
  return null;
}

/**
 * Calls `onChange` after mount and after every navigation. The pathname is
 * read behind its own Suspense boundary, so the caller still prerenders on
 * routes whose params are only known at request time.
 */
function PathWatcher({ onChange }: { onChange: (pathname: string) => void }) {
  return (
    <Suspense fallback={null}>
      <PathReader onChange={onChange} />
    </Suspense>
  );
}

/* ------------------------------------------------------------------ */
/* Desktop navigation                                                  */
/* ------------------------------------------------------------------ */

/** Reads a motion token for script: "--dur-base" gives "200ms", "--ease-move" its curve. */
function motionToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}
const toMs = (duration: string) => parseFloat(duration) * (duration.endsWith("ms") ? 1 : 1000);

/**
 * Plays the active pill's move from the link `from` to the link `to` (either may be missing). The
 * pill is each link's ::before, already in its final place; this only animates how it got there.
 */
function movePill(root: HTMLElement, from: HTMLElement | null, to: HTMLElement | null) {
  const a = from?.getBoundingClientRect();
  const b = to?.getBoundingClientRect();
  const pill = { pseudoElement: "::before" };
  try {
    const base = toMs(motionToken(root, "--dur-base"));
    if (to && b?.width) {
      if (a?.width) {
        // The new link's pill starts over the old link, at the old link's size, and travels home.
        to.animate(
          {
            translate: [`${a.left + a.width / 2 - (b.left + b.width / 2)}px ${a.top + a.height / 2 - (b.top + b.height / 2)}px`, "0 0"],
            scale: [`${a.width / b.width} ${a.height / b.height}`, "1 1"],
          },
          { ...pill, duration: base, easing: motionToken(root, "--ease-move") },
        );
      } else {
        // No link was active before: the pill pops in where it is. The label must turn white at once
        // then: the delay in chrome.css is for a pill that is still travelling, and here it would
        // leave dark text on a dark pill.
        to.style.transitionDelay = "0s";
        const pop = to.animate({ opacity: [0, 1], scale: [0.9, 1] }, { ...pill, duration: base, easing: motionToken(root, "--ease-pop") });
        pop.finished.then(() => to.style.removeProperty("transition-delay")).catch(() => to.style.removeProperty("transition-delay"));
      }
    } else if (from && a?.width) {
      // No link is active now: the old pill fades away.
      from.animate({ opacity: [1, 0] }, { ...pill, duration: toMs(motionToken(root, "--dur-fast")), easing: motionToken(root, "--ease-exit") });
    }
  } catch {
    // The move is decoration. If a token is missing or the browser refuses, the pill is simply in its new place.
  }
}

/**
 * Lets the dark pill behind the active nav link glide from the old link to the new one. CSS draws
 * the pill (`.site-nav-link::before`), so it is in the right place without this hook; the hook
 * only plays the move. Nothing is measured ahead of time: both links are read at the moment of
 * the change, so late fonts and resized windows cannot leave the pill in the wrong place.
 */
function useActivePill(nav: RefObject<HTMLElement | null>, activeKey: string | null) {
  // undefined until the first run, then the link that was active last time (or null for none).
  const last = useRef<HTMLElement | null | undefined>(undefined);
  useLayoutEffect(() => {
    const root = nav.current;
    if (!root) return;
    const to = root.querySelector<HTMLElement>('[data-active="true"]');
    const from = last.current;
    last.current = to;
    // Nothing moves when the page first loads, when the same link stays active, or under reduced motion.
    if (from === undefined || from === to) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    movePill(root, from, to);
  }, [nav, activeKey]);
}

export function DesktopNav({ categories }: { categories: NavCategory[] }) {
  // Without a known pathname (a route whose params arrive at request time) the
  // prerendered shell shows the nav with no active link, then fills it in.
  return (
    <Suspense fallback={<DesktopNavView categories={categories} pathname="" />}>
      <DesktopNavAtPath categories={categories} />
    </Suspense>
  );
}

function DesktopNavAtPath({ categories }: { categories: NavCategory[] }) {
  return <DesktopNavView categories={categories} pathname={usePathname()} />;
}

function DesktopNavView({ categories, pathname }: { categories: NavCategory[]; pathname: string }) {
  // The panel remembers the page it was opened on, so navigating closes it.
  const [openOn, setOpenOn] = useState<string | null>(null);
  // Forget it as soon as the page changes, however the visitor left (search, the logo, Back):
  // otherwise the panel would open by itself when they return to that page.
  if (openOn !== null && openOn !== pathname) setOpenOn(null);
  const open = openOn === pathname;
  const panel = useLayer(open);
  const nav = useRef<HTMLElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpenOn(null), []);
  const panelId = useId();
  useDismiss(open, close, wrap, trigger);

  const linkClass = (active: boolean) =>
    cn("site-nav-link whitespace-nowrap rounded-full px-2 py-2 text-sm font-medium xl:px-3 xl:text-[0.9375rem]", active ? "text-paper" : "text-ink-2 hover:bg-sand-2 hover:text-ink");
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const topicsActive = pathname.startsWith("/topics") || pathname.startsWith("/articles");
  useActivePill(nav, topicsActive ? "topics" : (PRIMARY_LINKS.find((l) => isActive(l.href))?.href ?? null));

  return (
    <nav ref={nav} aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
      <div ref={wrap} className="relative">
        <button
          ref={trigger}
          type="button"
          className={cn(linkClass(topicsActive), "inline-flex items-center gap-1")}
          data-active={topicsActive || undefined}
          aria-expanded={open}
          aria-controls={panelId}
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          Topics
          <Icon name="chevron-down" size={16} className={cn("transition-[rotate] duration-(--dur-base) ease-pop", open && "rotate-180")} />
        </button>
        {panel.mounted && (
          // Width: 820px, or less on a narrow desktop window, so the panel ends inside the page gutter
          // (it starts about 230px from the left edge, after the logo).
          <div
            id={panelId}
            className="motion-menu absolute left-0 top-[calc(100%+12px)] z-50 w-[min(820px,calc(100vw-270px))] rounded-[26px] border border-line bg-paper p-4 shadow-pop"
            style={FROM_TOP_LEFT}
            data-state={panel.state}
            inert={!open}
            // A link to another page closes the panel when that page is on screen (see openOn above).
            onClick={(e) => followedLinkToThisPage(e) && close()}
          >
            <div className="grid grid-cols-[1fr_210px] gap-4">
              <ul className="grid grid-cols-2 gap-1">
                {categories.map((c, i) => (
                  // Row by row, and the last rows together, so the whole panel has arrived in about 300 ms.
                  <li key={c.slug} className="site-nav-cascade" style={stagger(Math.min(Math.floor(i / 2), 5))}>
                    <Link
                      href={`/topics/${c.slug}`}
                      className={cn(`tone-${c.color}`, "group flex items-center gap-3 rounded-2xl p-2 transition-colors duration-(--dur-fast) hover:bg-tone-soft")}
                    >
                      <Sticker name={c.sticker} size={38} flat className="group-hover:-rotate-6 group-hover:scale-110" />
                      <span className="min-w-0">
                        <span className="block truncate text-[0.9375rem] font-semibold leading-tight">{c.name}</span>
                        <span className="block truncate text-xs text-ink-3">{c.tagline}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
              <div className="site-nav-cascade rounded-2xl bg-sand p-3" style={stagger(1)}>
                <p className="eyebrow px-2 pb-2 pt-1 text-ink-3">Also here</p>
                <ul>
                  {MORE_LINKS.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className="group flex items-center gap-2.5 rounded-xl p-2 text-[0.9375rem] font-medium transition-colors duration-(--dur-fast) hover:bg-paper">
                        <Sticker name={l.sticker} size={26} flat className="group-hover:scale-110" />
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
        <Link key={l.href} href={l.href} className={linkClass(isActive(l.href))} data-active={isActive(l.href) || undefined}>
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
  const [open, setOpen] = useState(false);
  // Where the sheet starts: the header's bottom edge. That is lower than --header-h while the
  // announcement bar is on screen, so it is measured when the menu opens, not assumed.
  const [top, setTop] = useState<number | null>(null);
  const sheet = useLayer(open);
  const button = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const measure = useCallback(() => {
    const header = button.current?.closest("header");
    // The bottom of the header's background, so the sheet also covers the hairline border below it:
    // the border is see-through, and the page would show between the two.
    if (header) setTop(header.getBoundingClientRect().top + header.clientTop + header.clientHeight);
  }, []);
  useScrollLock(open);
  useFocusTrap(open, panel, button);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      returnFocus(button.current, panel.current);
      setOpen(false);
    };
    // The header can still move while the menu is open: the window is resized or turned, or the
    // browser lets the page scroll in spite of the lock. On a wide window the menu button is gone,
    // so the menu closes instead of holding the page still with nothing to show for it.
    const onMove = () => (button.current?.offsetParent ? measure() : setOpen(false));
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, { passive: true });
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove);
    };
  }, [open, measure]);

  return (
    <>
      <PathWatcher onChange={close} />
      <button
        ref={button}
        type="button"
        className="site-icon-button site-menu-button inline-flex size-11 items-center justify-center rounded-full hover:bg-sand-2 lg:hidden"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => {
          if (!open) measure();
          setOpen(!open);
        }}
      >
        <MenuToggleIcon open={open} size={24} />
      </button>
      {sheet.mounted && (
        <div
          ref={panel}
          className="site-menu-sheet fixed inset-x-0 bottom-0 top-[var(--header-h)] z-50 overflow-y-auto overscroll-contain bg-sand lg:hidden"
          style={top === null ? undefined : { top }}
          data-state={sheet.state}
          inert={!open}
          role="dialog"
          aria-modal="true"
          aria-label="Menu"
          onClick={(e) => {
            // A link to another page: the sheet stays until that page is on screen (PathWatcher closes
            // it then), so the page being left does not flash between the menu and the new page.
            if (!followedLinkToThisPage(e)) return;
            returnFocus(button.current, panel.current);
            close();
          }}
        >
          <div className="container-hm py-6">
            <ul className="grid gap-1">
              {[{ href: "/articles", label: "All articles" }, ...PRIMARY_LINKS, { href: "/myths", label: "Myth or fact" }, { href: "/glossary", label: "Glossary" }].map((l, i) => (
                // The first rows arrive one by one, the rest together: everything is in place in about 300 ms.
                <li key={l.href} className="site-nav-cascade" style={stagger(Math.min(i, 5))}>
                  <Link href={l.href} className="site-menu-row flex items-center justify-between rounded-2xl bg-paper px-4 py-3.5 text-lg font-medium active:bg-sand-2">
                    {l.label}
                    <Icon name="arrow-right" size={18} className="nudge-x text-ink-3" />
                  </Link>
                </li>
              ))}
            </ul>
            <p className="site-nav-cascade eyebrow mt-8 text-ink-3" style={stagger(5)}>
              Topics
            </p>
            <ul className="site-nav-cascade mt-3 grid grid-cols-2 gap-2" style={stagger(5)}>
              {categories.map((c) => (
                <li key={c.slug}>
                  <Link href={`/topics/${c.slug}`} className={cn(`tone-${c.color}`, "pressable flex items-center gap-2.5 rounded-2xl bg-tone-soft p-3 text-[0.9375rem] font-semibold leading-tight text-tone-ink")}>
                    <Sticker name={c.sticker} size={32} flat />
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="site-nav-cascade mt-8 grid grid-cols-2 gap-2" style={stagger(5)}>
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

const ACCOUNT_ROW = "flex items-center gap-2.5 rounded-xl px-3 py-2 text-[0.9375rem] font-medium transition-colors duration-(--dur-fast) hover:bg-sand";

export function AccountButton() {
  const [me, setMe] = useState<Me | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const menu = useLayer(open);
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const latest = useRef(0);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, wrap, trigger);

  // Signing in or out always navigates, so re-checking on navigation is enough.
  const onNavigate = useCallback(() => {
    setOpen(false);
    const request = ++latest.current;
    fetch("/api/me", { credentials: "same-origin" })
      .then((r) => (r.ok ? r.json() : { user: null }))
      .then((d) => request === latest.current && setMe(d.user ?? null))
      .catch(() => request === latest.current && setMe(null));
  }, []);
  const watcher = <PathWatcher onChange={onNavigate} />;

  if (me === undefined) {
    return (
      <>
        {watcher}
        <span className="hidden size-10 rounded-full bg-sand-2 sm:block" aria-hidden />
      </>
    );
  }
  // Whichever control replaces the placeholder fades in (animate-fade), so the swap is not a blink.
  if (me === null) {
    return (
      <>
        {watcher}
        <Link href="/login" className="btn btn-ghost btn-sm hidden animate-fade sm:inline-flex">
          Sign in
        </Link>
      </>
    );
  }
  const staff = me.role === "admin" || me.role === "editor";
  return (
    <div ref={wrap} className="relative">
      {watcher}
      <button
        ref={trigger}
        type="button"
        className={cn(`tone-${me.color}`, "site-icon-button group flex size-10 animate-fade items-center justify-center rounded-full bg-tone-soft ring-2 ring-transparent hover:ring-ink")}
        aria-label={`Account menu for ${me.name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Sticker name={me.sticker} size={28} flat className="group-hover:scale-110" />
      </button>
      {menu.mounted && (
        <div
          className="motion-menu absolute right-0 top-[calc(100%+10px)] z-[55] w-60 rounded-3xl border border-line bg-paper p-2 shadow-pop"
          style={FROM_TOP_RIGHT}
          data-state={menu.state}
          inert={!open}
          onClick={(e) => followedLink(e) && close()}
        >
          <div className="px-3 pb-2 pt-2">
            <p className="truncate font-semibold leading-tight">{me.name}</p>
            <p className="truncate text-sm text-ink-3">@{me.handle}</p>
          </div>
          <div className="dotted-rule mx-2 my-1" />
          <Link href="/account" className={ACCOUNT_ROW}>
            <Icon name="user" size={18} /> My account
          </Link>
          <Link href="/saved" className={ACCOUNT_ROW}>
            <Icon name="bookmark" size={18} /> Saved reads
          </Link>
          {staff && (
            <Link href="/admin" className={ACCOUNT_ROW}>
              <Icon name="settings" size={18} /> Admin panel
            </Link>
          )}
          <form action={signOutAction}>
            <button type="submit" className={cn(ACCOUNT_ROW, "w-full text-left")}>
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

const TYPE_STICKER: Record<string, string> = {
  condition: "stethoscope",
  term: "chat",
  food: "apple",
  exercise: "dumbbell",
  tool: "tape",
  myth: "cross",
};

export function useSearch(query: string) {
  // Results are remembered together with the query they answer, so a stale
  // response is never shown for newer text and nothing is reset in the effect.
  const [result, setResult] = useState<{ q: string; hits: Hit[] } | null>(null);
  const q = query.trim();
  const wanted = q.length >= 2;
  useEffect(() => {
    if (!wanted) return;
    const ctrl = new AbortController();
    const timer = setTimeout(() => {
      fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then((d) => setResult({ q, hits: d.hits ?? [] }))
        .catch((err) => {
          if (err?.name !== "AbortError") setResult({ q, hits: [] });
        });
    }, 140);
    return () => {
      clearTimeout(timer);
      ctrl.abort();
    };
  }, [q, wanted]);
  const current = wanted && result?.q === q;
  return { hits: current ? result.hits : [], loading: wanted && !current };
}

export function SearchHitRow({ hit, colorOf, active, onNavigate }: { hit: Hit; colorOf: Record<string, string>; active?: boolean; onNavigate?: () => void }) {
  const color = colorOf[hit.category] ?? "sand";
  return (
    <Link
      href={hit.href}
      onClick={onNavigate}
      className={cn(`tone-${color}`, "group flex items-start gap-3 rounded-2xl p-2.5 transition-colors duration-(--dur-fast) hover:bg-sand", active && "bg-sand")}
    >
      <span className="flex size-11 flex-none items-center justify-center rounded-xl bg-tone-soft">
        <Sticker name={hit.sticker || TYPE_STICKER[hit.type] || "magnifier"} size={30} flat className="group-hover:scale-110" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-semibold leading-snug">{hit.title}</span>
          <span className="eyebrow flex-none text-ink-3">{SEARCH_TYPE_LABEL[hit.type] ?? hit.type}</span>
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
  const layer = useLayer(open);
  const button = useRef<HTMLButtonElement>(null);
  const dialog = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const close = useCallback(() => setOpen(false), []);
  // Closing without going anywhere (Escape, the Esc button, a click on the backdrop) hands focus back to the search button.
  const dismiss = useCallback(() => {
    returnFocus(button.current, dialog.current);
    setOpen(false);
  }, []);
  const { hits, loading } = useSearch(query);
  useScrollLock(open);
  useFocusTrap(open, dialog);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement)?.tagName ?? "") || (e.target as HTMLElement)?.isContentEditable;
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "Escape" && open) dismiss();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, dismiss]);
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => input.current?.focus(), 30);
    return () => clearTimeout(t);
  }, [open]);

  const visible = hits.slice(0, 8);
  const go = (q: string) => {
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}`);
  };

  return (
    <>
      <PathWatcher onChange={close} />
      <button
        ref={button}
        type="button"
        className="site-icon-button inline-flex size-11 items-center justify-center rounded-full hover:bg-sand-2"
        aria-label="Search"
        onClick={() => setOpen(true)}
      >
        <Icon name="search" size={22} />
      </button>
      {layer.mounted && (
        // The backdrop and the dialog are side by side, not nested, so each has its own way in and
        // out: the backdrop fades while the dialog settles. What is typed never animates.
        <div className="fixed inset-0 z-[60] flex items-start justify-center p-3 pt-[8vh] data-[state=closed]:pointer-events-none" data-state={layer.state} inert={!open}>
          <div className="site-search-scrim motion-fade absolute inset-0 bg-ink/40 backdrop-blur-sm" data-state={layer.state} onClick={dismiss} />
          <div ref={dialog} role="dialog" aria-modal="true" aria-label="Search" className="motion-dialog relative w-full max-w-2xl overflow-hidden rounded-[28px] bg-paper shadow-pop" data-state={layer.state}>
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
                onChange={(e) => {
                  setQuery(e.target.value);
                  setCursor(0);
                }}
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
              <button type="button" className="eyebrow flex-none rounded-md border border-line-strong px-2 py-1.5 text-ink-3 transition-colors duration-(--dur-fast) hover:bg-sand" onClick={dismiss}>
                Esc
              </button>
            </form>
            <div className="max-h-[60vh] overflow-y-auto p-2.5">
              {query.trim().length < 2 ? (
                <div className="p-3">
                  <p className="eyebrow text-ink-3">Try</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {SUGGESTIONS.map((s) => (
                      <button key={s} type="button" className="chip chip-outline pressable hover:border-ink hover:text-ink" onClick={() => setQuery(s)}>
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
                    <button
                      type="button"
                      className="mt-1 flex w-full items-center justify-center gap-2 rounded-2xl p-3 text-sm font-semibold transition-colors duration-(--dur-fast) hover:bg-sand"
                      onClick={() => go(query.trim())}
                    >
                      See all {hits.length} results <Icon name="arrow-right" size={16} className="nudge-x" />
                    </button>
                  )}
                </>
              ) : (
                <p className="flex items-center justify-center gap-2 p-6 text-center text-ink-3">
                  {loading && <Spinner />}
                  {loading ? "Searching…" : `Nothing for "${query.trim()}" yet. Try a broader word.`}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
