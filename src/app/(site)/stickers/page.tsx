import { Sticker } from "@/components/stickers/Sticker";
import { STICKER_NAMES } from "@/components/stickers/art";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata = { title: "Sticker sheet" };

export default function StickerSheetPage() {
  return (
    <PageTransition>
      <main className="bg-sand py-16">
        <div className="container-hm">
          <p className="eyebrow text-ink-3">The whole sheet</p>
          <h1 className="display display-lg mt-3">
            Every sticker, <span className="serif-accent">peeled.</span>
          </h1>
          {/* Rows below the first screen arrive as they scroll into view ("reveal"). A sticker peels
              up on hover (sticker-hover) and squashes when pressed (.sticker-sheet in home.css). */}
          <div className="sticker-sheet mt-10 grid grid-cols-3 gap-4 sm:grid-cols-5 lg:grid-cols-8">
            {STICKER_NAMES.map((name, i) => (
              <div key={name} className="reveal kiss-cut flex flex-col items-center gap-3 bg-paper px-2 py-5">
                <Sticker name={name} size={84} rotate={((i * 37) % 17) - 8} label={`${name} sticker`} className="sticker-hover" />
                <span className="eyebrow text-ink-3">{name}</span>
              </div>
            ))}
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
