import type { Metadata } from "next";
import Link from "next/link";
import { Sticker } from "@/components/stickers/Sticker";

export const metadata: Metadata = { title: "Page not found" };

/** Shown for any address that matches no page, with ways back in. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-sand px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <div className="flex items-end justify-center gap-2">
          <Sticker name="bandage" size={88} rotate={-14} />
          <Sticker name="magnifier" size={112} rotate={8} />
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
  );
}
