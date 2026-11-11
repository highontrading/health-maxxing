"use client";

import Link from "next/link";
import { useState } from "react";
import { Icon } from "@/components/Icon";
import { Collapse } from "@/components/motion/Collapse";
import { stagger } from "@/components/motion/stagger";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useReducedMotion } from "@/lib/hooks";
import { useSaved } from "./ArticleClient";

/** How long a removed row takes to fade and close up (--dur-base, `.saved-item` in reading.css) before it leaves the list. */
const LEAVE_MS = 200;

export function SavedList() {
  const { items, remove } = useSaved();
  const reduced = useReducedMotion();
  // Rows on their way out. They stay in the list, closed and inert, until the timer removes them for good.
  const [leaving, setLeaving] = useState<string[]>([]);
  // True once a row has been removed here, so the empty panel only arrives with motion after a click, never on load.
  const [removed, setRemoved] = useState(false);

  const onRemove = (slug: string) => {
    setRemoved(true);
    if (reduced) {
      remove(slug);
      return;
    }
    setLeaving((list) => [...list, slug]);
    window.setTimeout(() => {
      remove(slug);
      setLeaving((list) => list.filter((s) => s !== slug));
    }, LEAVE_MS);
  };

  if (!items.length) {
    return (
      <div className={cn("flex flex-col items-center rounded-[26px] bg-paper px-6 py-16 text-center", removed && "saved-empty-enter")}>
        <Sticker name="star" size={84} rotate={-8} className={removed ? "enter-pop" : undefined} style={stagger(1)} />
        <p className="mt-5 text-xl font-medium">Nothing saved yet.</p>
        <p className="mt-2 max-w-sm text-ink-3">Tap Save on any article and it will wait for you here.</p>
        <Link href="/articles" className="btn btn-primary mt-6">
          Find something to read <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }
  return (
    // The gap between rows is inside each row (mb-2), so it closes up with the row; -mb-2 takes it back after the last one.
    <ul className="-mb-2">
      {items.map((item) => (
        <li key={item.slug}>
          <Collapse open={!leaving.includes(item.slug)} className="saved-item">
            <div className={cn(`tone-${item.color}`, "saved-row group relative mb-2 flex items-center gap-4 rounded-[22px] bg-paper p-3")}>
              <span className="flex size-[68px] flex-none items-center justify-center rounded-2xl bg-tone-soft">
                <Sticker name={item.sticker} size={44} flat className="group-hover:-rotate-6 group-hover:scale-110" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[0.8125rem] font-medium text-ink-3">
                  <span className="font-semibold text-tone-ink">{item.category}</span> · {item.minutes} min
                </p>
                <h2 className="mt-0.5 text-[1.0625rem] font-semibold leading-snug">
                  <Link href={`/articles/${item.slug}`} className="after:absolute after:inset-0 after:rounded-[22px]">
                    {item.title}
                  </Link>
                </h2>
              </div>
              <button
                type="button"
                className="saved-remove relative z-10 flex size-10 flex-none items-center justify-center rounded-full text-ink-3 hover:bg-sand hover:text-ink"
                aria-label={`Remove ${item.title} from saved reads`}
                onClick={() => onRemove(item.slug)}
              >
                <Icon name="close" size={18} />
              </button>
            </div>
          </Collapse>
        </li>
      ))}
    </ul>
  );
}
