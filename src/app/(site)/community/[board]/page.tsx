import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Pagination, ThreadRow, ThreadRowsSkeleton } from "@/components/forum/ForumBits";
import { Icon } from "@/components/Icon";
import { Sticker } from "@/components/stickers/Sticker";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getBoard, listThreads, THREADS_PER_PAGE } from "@/lib/forum";
import { requestTime } from "@/lib/now";
import { PageTransition, Swap } from "@/components/motion/PageTransition";
import { stagger } from "@/components/motion/stagger";

type Props = PageProps<"/community/[board]">;

export const metadata: Metadata = { title: "Community board" };

export default function BoardPage(props: Props) {
  return (
    <PageTransition>
      <main>
        <Suspense
          fallback={
            <Swap>
              <BoardSkeleton />
            </Swap>
          }
        >
          <Swap>
            <BoardView {...props} />
          </Swap>
        </Suspense>
      </main>
    </PageTransition>
  );
}

/** The board's colour is only known once it has loaded, so the placeholder band is plain sand. A screen tall, so the footer stays below the fold. */
function BoardSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true">
      <div className="bg-sand">
        <div className="container-hm pb-10 pt-8 md:pb-12 md:pt-12">
          <div className="skeleton h-4 w-56 max-w-full rounded-full" />
          <div className="skeleton mt-6 h-11 w-80 max-w-full rounded-2xl md:h-16" />
          <div className="skeleton mt-4 h-5 w-full max-w-md rounded-full" />
          <div className="skeleton mt-6 h-11 w-40 rounded-full" />
        </div>
      </div>
      <div className="container-hm py-8 md:py-12">
        <div className="skeleton h-4 w-20 rounded-full" />
        <div className="mt-3">
          <ThreadRowsSkeleton rows={5} />
        </div>
      </div>
    </div>
  );
}

async function BoardView({ params, searchParams }: Props) {
  await connection();
  const [{ board: slug }, query, user] = await Promise.all([params, searchParams, getSessionUser()]);
  const board = await getBoard(slug);
  if (!board) notFound();
  const page = Math.max(1, Number(Array.isArray(query.page) ? query.page[0] : query.page) || 1);
  const { threads, total } = await listThreads({ boardId: board.id, page, includeHidden: isStaff(user) });
  const now = await requestTime();

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
          <Sticker name={board.sticker} size={130} rotate={8} className="enter-pop hidden flex-none md:block" style={stagger(3)} />
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
            <Sticker name={board.sticker} size={84} rotate={-8} className="enter-pop" style={stagger(3)} />
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
