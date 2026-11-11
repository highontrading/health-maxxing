import Link from "next/link";
import { cacheLife } from "next/cache";
import { getCategories, getSettings } from "@/lib/data";
import { stagger } from "@/components/motion/stagger";
import { NewsletterForm } from "@/components/NewsletterForm";
import { Sticker } from "@/components/stickers/Sticker";
import { Logo } from "./Logo";

async function currentYear(): Promise<number> {
  "use cache";
  cacheLife("days");
  return new Date().getFullYear();
}

/** Footer links: the underline draws itself and the colour fades (see .site-footer-link in styles/motion/chrome.css). */
const FOOTER_LINK = "site-footer-link link-draw";
/** The two stickers beside the prescription card pop in on scroll and lean into the pointer. */
const FOOTER_STICKER = "reveal reveal-pop absolute hover:scale-110 hover:rotate-[calc(var(--r)+6deg)]";

const SOCIAL_LABELS: Record<string, string> = {
  instagram: "Instagram",
  x: "X",
  youtube: "YouTube",
  tiktok: "TikTok",
  threads: "Threads",
  linkedin: "LinkedIn",
};

export async function Footer() {
  const [categories, settings, year] = await Promise.all([getCategories(), getSettings(), currentYear()]);
  const socials = Object.entries(settings.social).filter(([, url]) => /^https:\/\//.test(url));

  const columns = [
    {
      title: "Look it up",
      links: [
        { href: "/conditions", label: "Conditions A to Z" },
        { href: "/body", label: "Body map" },
        { href: "/glossary", label: "Glossary" },
        { href: "/myths", label: "Myth or fact" },
        { href: "/search", label: "Search" },
      ],
    },
    {
      title: "Do the thing",
      links: [
        { href: "/tools", label: "Calculators" },
        { href: "/exercises", label: "Exercise library" },
        { href: "/foods", label: "Food database" },
        { href: "/community", label: "Community" },
        { href: "/newsletter", label: "Newsletter" },
      ],
    },
    {
      title: "About us",
      links: [
        { href: "/about", label: "About" },
        { href: "/editorial-policy", label: "Editorial policy" },
        { href: "/medical-disclaimer", label: "Medical disclaimer" },
        { href: "/contact", label: "Contact" },
        { href: "/stickers", label: "Sticker sheet" },
      ],
    },
  ];

  return (
    <footer className="relative overflow-hidden bg-ink text-paper">
      <div className="container-hm relative py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <p className="eyebrow text-lime">{settings.newsletter.name}</p>
            <h2 className="display display-md mt-4 max-w-xl">
              Want the useful stuff <span className="serif-accent text-lime">in your inbox?</span>
            </h2>
            <p className="mt-4 max-w-md text-white/70">{settings.newsletter.blurb}</p>
            <NewsletterForm source="footer" dark className="mt-6" />
          </div>
          {/* Decoration: the card and its stickers arrive as the footer scrolls into view, and answer the pointer. */}
          <div className="relative hidden lg:block" aria-hidden="true">
            <div className="reveal absolute right-6 top-2 flex w-[300px] rotate-3 flex-col gap-3 rounded-[26px] bg-paper p-5 text-ink shadow-pop transition-[rotate] duration-(--dur-slow) ease-pop hover:rotate-0">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Rx</span>
                <span className="pixel-tag">Repeat weekly</span>
              </div>
              <p className="text-2xl font-medium leading-tight tracking-tight">One email. Something worth knowing about your body.</p>
              <div className="dotted-rule" />
              <p className="eyebrow text-ink-3">Side effects: feeling informed</p>
            </div>
            <Sticker name="pill" size={96} rotate={-18} className={`${FOOTER_STICKER} right-[300px] top-0`} style={stagger(1)} />
            <Sticker name="mail" size={84} rotate={10} className={`${FOOTER_STICKER} right-0 top-[170px]`} style={stagger(2)} />
          </div>
        </div>

        <div className="mt-16 grid gap-10 border-t border-white/15 pt-12 md:grid-cols-[1.3fr_2fr]">
          <div>
            <Logo stacked inverse />
            <p className="mt-5 max-w-xs text-sm leading-relaxed text-white/60">{settings.site.description}</p>
            {socials.length > 0 && (
              <ul className="mt-6 flex flex-wrap gap-2">
                {socials.map(([key, url]) => (
                  <li key={key}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-11 items-center rounded-full bg-sand px-4 text-sm font-semibold text-ink transition-transform duration-(--dur-fast) ease-enter hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.97]"
                    >
                      {SOCIAL_LABELS[key] ?? key}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div>
              <h3 className="eyebrow text-white/50">Topics</h3>
              <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                {categories.slice(0, 8).map((c) => (
                  <li key={c.slug}>
                    <Link href={`/topics/${c.slug}`} className={`${FOOTER_LINK} text-white/85 hover:text-lime`}>
                      {c.name}
                    </Link>
                  </li>
                ))}
                <li>
                  <Link href="/topics" className={`${FOOTER_LINK} font-semibold text-lime`}>
                    All {categories.length} topics
                  </Link>
                </li>
              </ul>
            </div>
            {columns.map((col) => (
              <div key={col.title}>
                <h3 className="eyebrow text-white/50">{col.title}</h3>
                <ul className="mt-4 space-y-2.5 text-[0.9375rem]">
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link href={l.href} className={`${FOOTER_LINK} text-white/85 hover:text-lime`}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-12 rounded-2xl bg-white/[0.06] p-5 text-sm leading-relaxed text-white/65">
          <strong className="font-semibold text-white/90">Health Maxxing is for information only.</strong> Nothing here is medical advice, a
          diagnosis or a substitute for seeing a qualified health professional. If you think you may have a medical emergency, call your local
          emergency number.{" "}
          <Link href="/medical-disclaimer" className="text-white underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-lime">
            Read the full disclaimer
          </Link>
          .
        </div>

        <div className="mt-8 flex flex-col gap-3 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {settings.site.name}. All rights reserved.
          </p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2">
            <li><Link href="/privacy" className={`${FOOTER_LINK} hover:text-white`}>Privacy</Link></li>
            <li><Link href="/terms" className={`${FOOTER_LINK} hover:text-white`}>Terms</Link></li>
            <li><Link href="/community-guidelines" className={`${FOOTER_LINK} hover:text-white`}>Community guidelines</Link></li>
            <li><a href="/rss.xml" className={`${FOOTER_LINK} hover:text-white`}>RSS</a></li>
          </ul>
        </div>
      </div>
    </footer>
  );
}
