import type { Metadata } from "next";
import { SavedList } from "@/components/article/SavedList";

export const metadata: Metadata = {
  title: "Saved reads",
  description: "Articles you have saved on this device.",
  robots: { index: false },
};

export default function SavedPage() {
  return (
    <main className="bg-sand">
      <div className="container-narrow py-12 md:py-20">
        <p className="eyebrow text-ink-3">Your reading list</p>
        <h1 className="display display-lg mt-4">
          Saved <span className="serif-accent">reads.</span>
        </h1>
        <p className="lede mt-4">Saved on this device only. No account needed, and nothing leaves your browser.</p>
        <div className="mt-8">
          <SavedList />
        </div>
      </div>
    </main>
  );
}
