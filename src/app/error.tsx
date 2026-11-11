"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Sticker } from "@/components/stickers/Sticker";

/** Shown when a page throws while rendering. The reader can retry without losing their place. */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="flex min-h-[70dvh] items-center justify-center bg-sand px-4 py-16">
      <div className="w-full max-w-xl text-center">
        <Sticker name="thermometer" size={104} rotate={-10} className="enter-pop" />
        <h1 className="display display-lg mt-6">
          Something went <span className="serif-accent">wrong.</span>
        </h1>
        <p className="lede mx-auto mt-4 max-w-md">That is on us, not you. Try again, and if it keeps happening, let us know which page you were on.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-2">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Go to the home page
          </Link>
          <Link href="/contact" className="btn btn-ghost">
            Contact us
          </Link>
        </div>
        {error.digest && <p className="mt-6 text-xs text-ink-3">Reference: {error.digest}</p>}
      </div>
    </main>
  );
}
