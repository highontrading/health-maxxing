import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { timeAgo, type ForumAuthor, type ForumThread } from "@/lib/forum";

export function Avatar({ author, size = 44 }: { author: Pick<ForumAuthor, "sticker" | "color">; size?: number }) {
  return (
    <span className={cn(`tone-${author.color}`, "flex flex-none items-center justify-center rounded-full bg-tone-soft")} style={{ width: size, height: size }} aria-hidden="true">
      <Sticker name={author.sticker} size={Math.round(size * 0.66)} flat />
    </span>
  );
}

export function AuthorName({ author }: { author: ForumAuthor }) {
  const team = author.role === "admin" || author.role === "editor";
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span className="font-semibold">{author.name}</span>
      {team && <span className="pixel-tag bg-[var(--pink-solid)]">Team</span>}
      <span className="text-sm text-ink-3">@{author.handle}</span>
    </span>
  );
}

export function ThreadRow({ thread, now, showBoard = false }: { thread: ForumThread; now: number; showBoard?: boolean }) {
  return (
    <li className={cn(`tone-${thread.boardColor}`, "group relative flex items-start gap-4 rounded-[20px] p-3 transition-colors hover:bg-sand sm:p-4")}>
      <Avatar author={thread.author} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-ink-3">
          {thread.pinned && (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Icon name="pin" size={13} /> Pinned
            </span>
          )}
          {thread.locked && (
            <span className="inline-flex items-center gap-1 font-semibold text-ink">
              <Icon name="lock" size={13} /> Locked
            </span>
          )}
          {thread.hidden && <span className="pixel-tag bg-[var(--orange-solid)]">Hidden</span>}
          {showBoard && <span className="font-semibold text-tone-ink">{thread.boardName}</span>}
          <span>{thread.author.name}</span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo(thread.lastPostAt, now)}</span>
        </p>
        <h3 className="mt-1 text-[1.125rem] font-semibold leading-snug tracking-[-0.01em]">
          <Link href={`/community/t/${thread.id}`} className="after:absolute after:inset-0 after:rounded-[20px]">
            {thread.title}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-1 text-[0.9375rem] text-ink-2">{thread.body.replace(/\*\*/g, "").replace(/\s+/g, " ").slice(0, 180)}</p>
      </div>
      <div className="hidden flex-none flex-col items-end gap-1 text-sm text-ink-3 sm:flex">
        <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
          <Icon name="message" size={15} /> {thread.replyCount}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Icon name="heart" size={14} /> {thread.likeCount}
        </span>
      </div>
    </li>
  );
}

export function Pagination({ page, total, perPage, base }: { page: number; total: number; perPage: number; base: string }) {
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (pages <= 1) return null;
  const href = (p: number) => (p <= 1 ? base : `${base}${base.includes("?") ? "&" : "?"}page=${p}`);
  return (
    <nav aria-label="Pagination" className="mt-8 flex items-center justify-between gap-4">
      {page > 1 ? (
        <Link href={href(page - 1)} className="btn btn-outline btn-sm">
          <Icon name="arrow-left" size={15} /> Newer
        </Link>
      ) : (
        <span />
      )}
      <span className="text-sm text-ink-3">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={href(page + 1)} className="btn btn-outline btn-sm">
          Older <Icon name="arrow-right" size={15} />
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}
