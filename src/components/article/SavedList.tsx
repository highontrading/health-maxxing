"use client";

import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { useSaved } from "./ArticleClient";

export function SavedList() {
  const { items, remove } = useSaved();
  if (!items.length) {
    return (
      <div className="flex flex-col items-center rounded-[26px] bg-paper px-6 py-16 text-center">
        <Sticker name="star" size={84} rotate={-8} />
        <p className="mt-5 text-xl font-medium">Nothing saved yet.</p>
        <p className="mt-2 max-w-sm text-ink-3">Tap Save on any article and it will wait for you here.</p>
        <Link href="/articles" className="btn btn-primary mt-6">
          Find something to read <Icon name="arrow-right" size={16} />
        </Link>
      </div>
    );
  }
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.slug} className={cn(`tone-${item.color}`, "group relative flex items-center gap-4 rounded-[22px] bg-paper p-3")}>
          <span className="flex size-[68px] flex-none items-center justify-center rounded-2xl bg-tone-soft">
            <Sticker name={item.sticker} size={44} flat />
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
            className="relative z-10 flex size-10 flex-none items-center justify-center rounded-full text-ink-3 hover:bg-sand hover:text-ink"
            aria-label={`Remove ${item.title} from saved reads`}
            onClick={() => remove(item.slug)}
          >
            <Icon name="close" size={18} />
          </button>
        </li>
      ))}
    </ul>
  );
}
