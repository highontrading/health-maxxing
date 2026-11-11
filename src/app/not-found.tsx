import type { Metadata } from "next";
import Link from "next/link";
import { PageTransition } from "@/components/motion/PageTransition";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";

export const metadata: Metadata = { title: "Page not found" };

const LOST_STICKER = "enter-pop hover:scale-110 hover:rotate-[calc(var(--r)+6deg)]";

/** Shown for any address that matches no page, with ways back in. */
export default function NotFound() {
  return (
    <PageTransition>
      <main className="flex min-h-dvh items-center justify-center bg-sand px-4 py-16">
        <div className="w-full max-w-xl text-center">
          {/* The two stickers pop in one after the other and lean into the pointer; the words below are simply there. */}
          <div className="site-lost-stickers flex items-end justify-center gap-2">
            <Sticker name="bandage" size={88} rotate={-14} className={LOST_STICKER} style={stagger(0)} />
            <Sticker name="magnifier" size={112} rotate={8} className={LOST_STICKER} style={stagger(2)} />
          </div>
          <p className="pixel-tag mt-8 bg-lime text-ink">Error 404</p>
          <h1 className="display display-lg mt-4">
            This page took a <span className="serif-accent">rest day.</span>
          </h1>
          <p className="lede mx-auto mt-4 max-w-md">The link may be old, or the page may have moved. Nothing is wrong with you; try one of these instead.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2">
            <Link href="/" className="btn btn-primary">
              Go to the home page
            </Link>
            <Link href="/search" className="btn btn-outline">
              Search the site
            </Link>
            <Link href="/conditions" className="btn btn-outline">
              Conditions A to Z
            </Link>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
