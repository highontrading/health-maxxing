import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination, ThreadRow } from "@/components/forum/ForumBits";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getBoard, listThreads, THREADS_PER_PAGE } from "@/lib/forum";

type Props = PageProps<"/community/[board]">;

export const metadata: Metadata = { title: "Community board" };

export default function BoardPage(props: Props) {
  return (
    <main>
      <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-sand" aria-busy="true" />}>
        <BoardView {...props} />
      </Suspense>
    </main>
  );
}

async function BoardView({ params, searchParams }: Props) {
  await connection();
  const [{ board: slug }, query, user] = await Promise.all([params, searchParams, getSessionUser()]);
  const board = await getBoard(slug);
  if (!board) notFound();
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
  const { threads, total } = await listThreads({ boardId: board.id, page, includeHidden: isStaff(user) });
  const now = Date.now();

  return (
    <div className={`tone-${board.color}`}>
      <header className="bg-tone-soft">
        <div className="container-hm flex items-end gap-6 pb-10 pt-8 md:pb-12 md:pt-12">
          <div className="min-w-0 flex-1">
            <Breadcrumbs className="text-tone-ink" items={[{ href: "/", label: "Home" }, { href: "/community", label: "Community" }, { label: board.name }]} />
            <h1 className="display display-lg mt-6 text-ink">{board.name}</h1>
            <p className="mt-3 max-w-[56ch] text-lg text-tone-ink">{board.description}</p>
            <Link href={`/community/new?board=${board.slug}`} className="btn btn-primary mt-6">
              <Icon name="plus" size={16} /> Start a thread
            </Link>
          </div>
          <Sticker name={board.sticker} size={130} rotate={8} className="hidden flex-none md:block" />
        </div>
      </header>
      <div className="container-hm py-8 md:py-12">
        <p className="text-sm text-ink-3">
          {total} {total === 1 ? "thread" : "threads"}
        </p>
        {threads.length ? (
          <ul className="mt-3 divide-y divide-line">
            {threads.map((t) => (
              <ThreadRow key={t.id} thread={t} now={now} />
            ))}
          </ul>
        ) : (
          <div className="mt-6 flex flex-col items-center rounded-[26px] bg-sand px-6 py-16 text-center">
            <Sticker name={board.sticker} size={84} rotate={-8} />
            <p className="mt-5 text-xl font-medium">Nothing here yet.</p>
            <Link href={`/community/new?board=${board.slug}`} className="btn btn-primary mt-5">
              Start the first thread
            </Link>
          </div>
        )}
        <Pagination page={page} total={total} perPage={THREADS_PER_PAGE} base={`/community/${board.slug}`} />
      </div>
    </div>
  );
}
