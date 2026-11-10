import type { Metadata } from "next";
import { Sticker } from "@/components/stickers/Sticker";
import { UnsubscribeForm } from "@/components/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Unsubscribe",
  robots: { index: false },
};

export default function UnsubscribePage() {
  return (
    <main className="bg-sand">
      <div className="container-narrow flex flex-col items-center py-16 text-center md:py-24">
        <Sticker name="mail" size={96} rotate={-8} />
        <h1 className="display display-md mt-6">
          Leaving so <span className="serif-accent">soon?</span>
        </h1>
        <div className="mt-6 max-w-md">
          <UnsubscribeForm />
        </div>
      </div>
    </main>
  );
}
