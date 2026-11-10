import Link from "next/link";
import { getCategories, getSettings } from "@/lib/data";
import { Icon } from "@/components/Icon";
import { AccountButton, DesktopNav, MobileMenu, SearchButton } from "./HeaderClient";
import { Logo } from "./Logo";

export async function Header() {
  const [categories, settings] = await Promise.all([getCategories(), getSettings()]);
  const nav = categories.map((c) => ({ slug: c.slug, name: c.name, tagline: c.tagline, sticker: c.sticker, color: c.color }));
  const colorOf = Object.fromEntries(categories.map((c) => [c.slug, c.color]));
  const { announcement } = settings;

  return (
    <>
      <a href="#main" className="btn btn-primary fixed left-3 top-3 z-[70] -translate-y-24 focus:translate-y-0">
        Skip to content
      </a>
      {announcement.enabled && announcement.text && (
        <div className="bg-ink text-paper">
          <div className="container-hm flex min-h-10 items-center justify-center gap-2 py-2 text-center text-sm font-medium">
            <span className="pixel-tag bg-lime text-ink">New</span>
            {announcement.href ? (
              <Link href={announcement.href} className="inline-flex items-center gap-1 underline-offset-4 hover:underline">
                {announcement.text} <Icon name="arrow-right" size={14} />
              </Link>
            ) : (
              <span>{announcement.text}</span>
            )}
          </div>
        </div>
      )}
      <header className="sticky top-0 z-40 border-b border-line bg-paper/90 backdrop-blur-md">
        <div className="container-hm flex h-[var(--header-h)] items-center gap-3">
          <Logo className="mr-2 flex-none" />
          <DesktopNav categories={nav} />
          <div className="ml-auto flex items-center gap-1">
            <SearchButton colorOf={colorOf} />
            <AccountButton />
            <Link href="/newsletter" className="btn btn-primary btn-sm ml-1 hidden sm:inline-flex">
              Subscribe
            </Link>
            <MobileMenu categories={nav} />
          </div>
        </div>
      </header>
    </>
  );
}
