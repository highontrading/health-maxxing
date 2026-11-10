import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import { ThreadRow } from "@/components/forum/ForumBits";
import { Icon } from "@/components/Icon";
import { PageHero } from "@/components/PageHero";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";
import { forumStats, listBoards, listThreads, timeAgo } from "@/lib/forum";
import { formatNumber } from "@/lib/format";
import { requestTime } from "@/lib/now";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = {
  title: "Community",
  description: "Compare notes with other people working on their health: nutrition, training, sleep, living with a condition and reading the research.",
  alternates: { canonical: "/community" },
};

export default function CommunityPage() {
  return (
    <PageTransition>
      <main>
        <PageHero
          color="blue"
          eyebrow="Community"
          title={
            <>
              Compare notes. <span className="serif-accent">Be kind. Cite sources.</span>
            </>
          }
          lede="A moderated place to ask questions, share what is working and make sense of the research together. Experience welcome; miracle cures not."
          stickers={["chat", "smile", "medal"]}
          crumbs={[{ href: "/", label: "Home" }, { label: "Community" }]}
        >
          <div className="flex flex-wrap gap-3">
            <Link href="/community/new" className="btn btn-primary">
              <Icon name="plus" size={16} /> Start a thread
            </Link>
            <Link href="/community-guidelines" className="btn btn-outline">
              House rules
            </Link>
          </div>
        </PageHero>
        <div className="container-hm py-10 md:py-14">
          <Suspense fallback={<ForumSkeleton />}>
            <CommunityHome />
          </Suspense>
        </div>
      </main>
    </PageTransition>
  );
}

function ForumSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-busy="true">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-40 animate-pulse rounded-[24px] bg-sand" />
      ))}
    </div>
  );
}

async function CommunityHome() {
  await connection();
  const [boards, recent, stats] = await Promise.all([listBoards(), listThreads({ limit: 10 }), forumStats()]);
  const now = await requestTime();

  return (
    <>
      <dl className="flex flex-wrap gap-x-10 gap-y-3">
        {[
          { label: "members", n: stats.members },
          { label: "threads", n: stats.threads },
          { label: "replies", n: stats.posts },
        ].map((s) => (
          <div key={s.label} className="flex items-baseline gap-2">
            <dd className="text-[2rem] font-medium leading-none tracking-[-0.04em]">{formatNumber(s.n)}</dd>
            <dt className="text-sm text-ink-3">{s.label}</dt>
          </div>
        ))}
      </dl>

      <h2 className="display display-sm mt-10">
        Boards
      </h2>
      <ul className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {boards.map((b, i) => (
          <li key={b.slug}>
            <Link href={`/community/${b.slug}`} className={cn(`tone-${b.color}`, "group flex h-full min-h-[190px] flex-col rounded-[24px] bg-tone-soft p-5 text-tone-ink transition-transform duration-300 hover:-translate-y-1")}>
              <span className="flex items-start justify-between">
                <Sticker name={b.sticker} size={52} rotate={i % 2 ? 8 : -8} className="transition-transform duration-300 group-hover:scale-110" />
                <span className="rounded-full bg-paper px-2.5 py-1 text-xs font-bold text-ink">
                  {b.threadCount} {b.threadCount === 1 ? "thread" : "threads"}
                </span>
              </span>
              <span className="mt-4 text-xl font-medium leading-tight tracking-[-0.02em] text-ink">{b.name}</span>
              <span className="mt-1.5 text-sm leading-snug opacity-90">{b.description}</span>
              {b.latest && (
                <span className="mt-auto pt-4 text-xs opacity-80">
                  Latest: <span className="font-semibold">{b.latest.title.length > 44 ? b.latest.title.slice(0, 42) + "…" : b.latest.title}</span> · {timeAgo(b.latest.at, now)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-14 flex items-end justify-between gap-4">
        <h2 className="display display-sm">
          Latest <span className="serif-accent">conversations</span>
        </h2>
        <Link href="/community/new" className="btn btn-outline btn-sm flex-none">
          <Icon name="plus" size={14} /> New thread
        </Link>
      </div>
      {recent.threads.length ? (
        <ul className="mt-4 divide-y divide-line">
          {recent.threads.map((t) => (
            <ThreadRow key={t.id} thread={t} now={now} showBoard />
          ))}
        </ul>
      ) : (
        <p className="mt-5 rounded-2xl bg-sand p-6 text-ink-2">No threads yet. Be the first to start one.</p>
      )}

      <p className="mt-12 rounded-2xl bg-sand p-5 text-sm leading-relaxed text-ink-2">
        Posts are members&apos; own views. They are not checked for accuracy and are not medical advice. If you think you may have a medical
        emergency, call your local emergency number.
      </p>
    </>
  );
}
