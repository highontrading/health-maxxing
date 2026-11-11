import { Sticker } from "@/components/stickers/Sticker";
import { STICKER_ART } from "@/components/stickers/art";

/**
 * Large statement text with stickers set inline. Write `{sticker-id}` in the
 * text wherever a sticker should appear. The words stay still; the stickers
 * are stamped on as they scroll into view (reveal-pop), in reading order.
 */
export function Manifesto({ text, className }: { text: string; className?: string }) {
  const parts = text.split(/(\{[a-z-]+\})/g).filter(Boolean);
  let n = 0;
  return (
    <p className={className}>
      {parts.map((part, i) => {
        const m = /^\{([a-z-]+)\}$/.exec(part);
        if (m && STICKER_ART[m[1]]) {
          const rotate = [-10, 8, -6, 12, -12, 6][n++ % 6];
          // No transition classes: .sticker brings its own, so the hover grows with a pop.
          return <Sticker key={i} name={m[1]} size="0.92em" rotate={rotate} className="reveal reveal-pop mx-[0.08em] align-[-0.14em] hover:scale-125" />;
        }
        return <span key={i}>{m ? "" : part}</span>;
      })}
    </p>
  );
}
