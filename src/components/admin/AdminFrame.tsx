"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import { signOutAction } from "@/app/actions/auth";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { COLLECTION_GROUPS, COLLECTIONS } from "@/lib/admin/collections";
import { cn } from "@/lib/cn";

type NavItem = { href: string; label: string; icon: string; badge?: number; adminOnly?: boolean };
type NavGroup = { title: string; items: NavItem[] };

export type FrameUser = { name: string; handle: string; role: string; sticker: string; color: string };
export type FrameCounts = { openReports: number; newMessages: number; queuedTopics: number };

function buildNav(counts: FrameCounts): NavGroup[] {
  return [
    { title: "", items: [{ href: "/admin", label: "Dashboard", icon: "home" }] },
    ...COLLECTION_GROUPS.map((group) => ({
      title: group,
      items: COLLECTIONS.filter((c) => c.group === group).map((c) => ({ href: `/admin/c/${c.key}`, label: c.plural, icon: c.icon })),
    })),
    {
      title: "Community",
      items: [
        { href: "/admin/community", label: "Moderation", icon: "flag", badge: counts.openReports },
        { href: "/admin/users", label: "Members", icon: "users" },
        { href: "/admin/subscribers", label: "Subscribers", icon: "mail", adminOnly: true },
        { href: "/admin/messages", label: "Messages", icon: "message", badge: counts.newMessages },
      ],
    },
    {
      title: "Site",
      items: [
        { href: "/admin/media", label: "Media", icon: "image" },
        { href: "/admin/autopilot", label: "Autopilot", icon: "bot", badge: counts.queuedTopics, adminOnly: true },
        { href: "/admin/api", label: "API tokens", icon: "key", adminOnly: true },
        { href: "/admin/settings", label: "Settings", icon: "settings", adminOnly: true },
        { href: "/admin/activity", label: "Activity", icon: "activity" },
        { href: "/admin/guide", label: "How it works", icon: "info" },
      ],
    },
  ];
}

/** The menu and the signed-in account. Rendered by the server once it knows who is signed in. */
export function AdminNav({ user, counts }: { user: FrameUser; counts: FrameCounts }) {
  const pathname = usePathname();
  const isActive = (href: string) => (href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(`${href}/`));
  return (
    <>
      <nav aria-label="Admin" className="flex-1 space-y-4 overflow-y-auto px-3 pb-6 pt-2">
        {buildNav(counts).map((group) => {
          const items = group.items.filter((i) => !i.adminOnly || user.role === "admin");
          if (!items.length) return null;
          return (
            <div key={group.title || "top"}>
              {group.title && <p className="eyebrow mb-1.5 px-3 text-ink-3">{group.title}</p>}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? "page" : undefined}
                        className={cn(
                          "flex items-center gap-2.5 rounded-xl px-3 py-1.5 text-[0.9375rem] font-medium transition-colors",
                          active ? "bg-ink text-paper" : "text-ink-2 hover:bg-sand-2 hover:text-ink",
                        )}
                      >
                        <Icon name={item.icon} size={18} className="flex-none" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {!!item.badge && (
                          <span className={cn("rounded-full px-1.5 text-xs font-bold tabular-nums", active ? "bg-paper text-ink" : "bg-[var(--pink-solid)] text-white")}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-line p-3">
        <div className="flex items-center gap-2.5 px-1">
          <span className={cn(`tone-${user.color}`, "flex size-9 flex-none items-center justify-center rounded-full bg-tone-soft")}>
            <Sticker name={user.sticker} size={24} flat />
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs capitalize text-ink-3">{user.role}</p>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <Link href="/admin/account" className="btn btn-ghost btn-sm">
            Account
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="btn btn-ghost btn-sm w-full">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  );
}

export function AdminNavSkeleton() {
  return (
    <div className="flex-1 space-y-2 px-4 pt-3" aria-busy="true">
      {[70, 55, 62, 48, 66, 58, 44, 60].map((w, i) => (
        <div key={i} className="h-7 animate-pulse rounded-lg bg-sand-2" style={{ width: `${w}%` }} />
      ))}
    </div>
  );
}

/** Tells the frame when the page changes, from behind its own boundary (the pathname is unknown while prerendering some routes). */
function OnNavigate({ run }: { run: () => void }) {
  const pathname = usePathname();
  useEffect(() => run(), [pathname, run]);
  return null;
}

/**
 * The fixed chrome around every admin page. It renders straight away; the
 * menu arrives in the `nav` slot once the server has checked the session.
 */
export function AdminFrame({ nav, children }: { nav: ReactNode; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);

  const brand = (
    <Link href="/admin" className="flex flex-none items-center gap-2 px-5 py-4">
      <Sticker name="heart" size={32} rotate={-8} flat />
      <span className="text-[1.0625rem] font-semibold leading-none tracking-[-0.03em]">
        Health <span className="serif-accent text-[1.12em] font-normal">Maxxing</span>
      </span>
      <span className="pixel-tag ml-1 bg-lime text-ink">Admin</span>
    </Link>
  );

  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[256px_minmax(0,1fr)]">
      <Suspense fallback={null}>
        <OnNavigate run={close} />
      </Suspense>

      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh flex-col border-r border-line bg-paper lg:flex">
        {brand}
        {nav}
      </aside>

      {/* Mobile bar */}
      <div className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-line bg-paper px-2 lg:hidden" style={{ viewTransitionName: "admin-bar" }}>
        <button
          type="button"
          className="inline-flex size-10 items-center justify-center rounded-full hover:bg-sand-2"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <Icon name={open ? "close" : "menu"} size={22} />
        </button>
        <span className="font-semibold">Admin</span>
        <Link href="/" className="btn btn-ghost btn-sm ml-auto">
          View site <Icon name="external" size={14} />
        </Link>
      </div>
      {open && <div className="fixed inset-x-0 bottom-0 top-14 z-40 flex flex-col bg-paper lg:hidden">{nav}</div>}

      <div className="min-w-0">
        <div className="hidden h-14 items-center justify-end gap-2 px-8 lg:flex">
          <Link href="/" target="_blank" className="btn btn-ghost btn-sm">
            View site <Icon name="external" size={14} />
          </Link>
        </div>
        <main id="main" className="mx-auto w-full max-w-[1280px] px-4 pb-20 pt-5 sm:px-6 lg:px-8 lg:pt-0">
          {children}
        </main>
      </div>
    </div>
  );
}
