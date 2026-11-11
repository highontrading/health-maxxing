import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ThreadForm } from "@/components/forum/ForumClient";
import { Icon } from "@/components/Icon";
import { requireUser } from "@/lib/auth";
import { listBoards } from "@/lib/forum";
import { PageTransition, Swap } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Start a thread", robots: { index: false } };

type Props = PageProps<"/community/new">;

export default function NewThreadPage({ searchParams }: Props) {
  return (
    <PageTransition>
      <main className="bg-sand">
        <div className="container-narrow py-10 md:py-16">
          <Link href="/community" transitionTypes={["nav-back"]} className="inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
            <Icon name="arrow-left" size={15} className="nudge-back" /> Community
          </Link>
          <h1 className="display display-md mt-5">
            Start a <span className="serif-accent">thread.</span>
          </h1>
          <div className="mt-8 rounded-[28px] border-[1.5px] border-ink bg-paper p-6 shadow-[0_8px_0_var(--ink)] md:p-9">
            <Suspense
              fallback={
                <Swap>
                  <ThreadFormSkeleton />
                </Swap>
              }
            >
              <Swap>
                <NewThread searchParams={searchParams} />
              </Swap>
            </Suspense>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}

/** The three fields and the button of the thread form, as placeholders. */
function ThreadFormSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true">
      {["h-11", "h-11", "h-56"].map((height, i) => (
        <div key={i}>
          <div className="skeleton h-3.5 w-16 rounded-full" />
          <div className={`skeleton mt-2 rounded-[14px] ${height}`} />
        </div>
      ))}
      <div className="skeleton h-[54px] w-40 rounded-full" />
    </div>
  );
}

async function NewThread({ searchParams }: Pick<Props, "searchParams">) {
  const query = await searchParams;
  const board = typeof query.board === "string" ? query.board : undefined;
  const user = await requireUser(board ? `/community/new?board=${board}` : "/community/new");
  if (user.banned) {
    return <p className="text-ink-2">Your account is suspended, so you cannot start threads.</p>;
  }
  const boards = await listBoards();
  return <ThreadForm boards={boards.map((b) => ({ slug: b.slug, name: b.name }))} defaultBoard={boards.some((b) => b.slug === board) ? board : undefined} />;
}
