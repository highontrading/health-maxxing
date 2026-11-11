import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AuthorName, Avatar } from "@/components/forum/ForumBits";
import { PostActions, ReplyForm } from "@/components/forum/ForumClient";
import { Icon } from "@/components/Icon";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { run } from "@/lib/db";
import { getThread, hasLiked, listPosts, timeAgo } from "@/lib/forum";
import { renderUserText } from "@/lib/markdown";
import { requestTime } from "@/lib/now";
import { PageTransition, Swap } from "@/components/motion/PageTransition";

type Props = PageProps<"/community/t/[id]">;

export const metadata: Metadata = { title: "Community thread", robots: { index: true, follow: true } };

export default function ThreadPage({ params }: Props) {
  return (
    <PageTransition>
      <main>
        <Suspense
          fallback={
            <Swap>
              <ThreadSkeleton />
            </Swap>
          }
        >
          <Swap>
            <ThreadView params={params} />
          </Swap>
        </Suspense>
      </main>
    </PageTransition>
  );
}

/** The board's colour is only known once the thread has loaded, so the placeholder band is plain sand. A screen tall, so the footer stays below the fold. */
function ThreadSkeleton() {
  return (
    <div className="min-h-dvh" aria-busy="true">
      <div className="bg-sand">
        <div className="container-narrow pb-8 pt-8 md:pb-10 md:pt-12">
          <div className="skeleton h-4 w-64 max-w-full rounded-full" />
          <div className="skeleton mt-6 h-10 w-full max-w-md rounded-2xl md:h-12" />
          <div className="skeleton mt-4 h-4 w-36 rounded-full" />
        </div>
      </div>
      <div className="container-narrow py-8 md:py-12">
        <div className="rounded-[24px] border-[1.5px] border-line-strong p-5 md:p-7">
          <div className="flex items-center gap-3">
            <div className="skeleton size-12 flex-none rounded-full" />
            <div className="flex-1 space-y-2">
              <div className="skeleton h-4 w-44 max-w-full rounded-full" />
              <div className="skeleton h-3 w-24 rounded-full" />
            </div>
          </div>
          <div className="mt-6 space-y-3">
            <div className="skeleton h-4 rounded-full" />
            <div className="skeleton h-4 w-11/12 rounded-full" />
            <div className="skeleton h-4 w-2/3 rounded-full" />
          </div>
          <div className="skeleton mt-7 h-9 w-16 rounded-full" />
        </div>
        <div className="mt-6 rounded-[24px] bg-sand p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="skeleton size-10 flex-none rounded-full" />
            <div className="skeleton h-4 w-40 max-w-full rounded-full" />
          </div>
          <div className="mt-5 space-y-3">
            <div className="skeleton h-4 rounded-full" />
            <div className="skeleton h-4 w-3/4 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

function UserText({ text }: { text: string }) {
  return <div className="prose-hm prose-compact [&_a]:break-words" dangerouslySetInnerHTML={{ __html: renderUserText(text) }} />;
}

async function ThreadView({ params }: Pick<Props, "params">) {
  await connection();
  const [{ id: rawId }, user, settings] = await Promise.all([params, getSessionUser(), getSettings()]);
  const id = Number(rawId);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const thread = await getThread(id);
  const staff = isStaff(user);
  if (!thread || (thread.hidden && !staff)) notFound();

  const [posts, liked] = await Promise.all([listPosts(id, user?.id ?? null, staff), user ? hasLiked(user.id, "thread", id) : false]);
  // Count the visit without blocking the response.
  void run("UPDATE forum_threads SET views = views + 1 WHERE id = ?", [id]).catch(() => {});
  const now = await requestTime();
  const canPost = !!user && !user.banned && (!thread.locked || staff) && (settings.community.enabled || staff);

  return (
    <div className={`tone-${thread.boardColor}`}>
      <header className="bg-tone-soft">
        <div className="container-narrow pb-8 pt-8 md:pb-10 md:pt-12">
          <Breadcrumbs className="text-tone-ink" items={[{ href: "/", label: "Home" }, { href: "/community", label: "Community" }, { href: `/community/${thread.boardSlug}`, label: thread.boardName }]} />
          <h1 className="display mt-6 text-[clamp(1.875rem,4vw,3rem)] text-ink">{thread.title}</h1>
          <p className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-tone-ink">
            {thread.pinned && (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Icon name="pin" size={14} /> Pinned
              </span>
            )}
            {thread.locked && (
              <span className="inline-flex items-center gap-1 font-semibold">
                <Icon name="lock" size={14} /> Locked
              </span>
            )}
            {thread.hidden && <span className="pixel-tag bg-[var(--orange-solid)]">Hidden from members</span>}
            <span>
              {thread.replyCount} {thread.replyCount === 1 ? "reply" : "replies"}
            </span>
            <span aria-hidden="true">·</span>
            <span>{thread.views + 1} views</span>
          </p>
        </div>
      </header>

      <div className="container-narrow py-8 md:py-12">
        <article className="rounded-[24px] border-[1.5px] border-ink p-5 md:p-7">
          <header className="flex items-center gap-3">
            <Avatar author={thread.author} size={48} />
            <div>
              <AuthorName author={thread.author} />
              <p className="text-sm text-ink-3">{timeAgo(thread.createdAt, now)}</p>
            </div>
          </header>
          <div className="mt-5">
            <UserText text={thread.body} />
          </div>
          <PostActions className="mt-6" type="thread" id={thread.id} count={thread.likeCount} liked={liked} signedIn={!!user} canReport={!!user} />
        </article>

        {posts.length > 0 && (
          <ol className="mt-6 space-y-4">
            {posts.map((post) => (
              <li key={post.id} id={`post-${post.id}`} className="scroll-mt-28 rounded-[24px] bg-sand p-5 md:p-6">
                <header className="flex items-center gap-3">
                  <Avatar author={post.author} size={40} />
                  <div>
                    <AuthorName author={post.author} />
                    <p className="text-sm text-ink-3">
                      {timeAgo(post.createdAt, now)}
                      {post.hidden && <span className="pixel-tag ml-2 bg-[var(--orange-solid)]">Hidden</span>}
                    </p>
                  </div>
                </header>
                <div className="mt-4">
                  <UserText text={post.body} />
                </div>
                <PostActions
                  className="mt-4"
                  type="post"
                  id={post.id}
                  count={post.likeCount}
                  liked={post.liked}
                  signedIn={!!user}
                  canReport={!!user && post.author.id !== user.id}
                  canDelete={!!user && (post.author.id === user.id || staff)}
                />
              </li>
            ))}
          </ol>
        )}

        <section className="mt-8">
          {canPost ? (
            <ReplyForm threadId={thread.id} />
          ) : thread.locked ? (
            <p className="flex items-center gap-2 rounded-2xl bg-sand p-5 text-ink-2">
              <Icon name="lock" size={18} /> This thread is locked, so new replies are closed.
            </p>
          ) : user?.banned ? (
            <p className="rounded-2xl bg-sand p-5 text-ink-2">Your account is suspended, so you cannot reply.</p>
          ) : !user ? (
            <div className="flex flex-col items-start gap-4 rounded-[24px] bg-tone-soft p-6 text-tone-ink sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-medium text-ink">Want to join in? Sign in to reply.</p>
              <div className="flex gap-2">
                <Link href={`/login?next=/community/t/${thread.id}`} className="btn btn-primary">
                  Sign in
                </Link>
                <Link href={`/signup?next=/community/t/${thread.id}`} className="btn btn-outline">
                  Create account
                </Link>
              </div>
            </div>
          ) : (
            <p className="rounded-2xl bg-sand p-5 text-ink-2">The community is closed for posting right now.</p>
          )}
        </section>

        <p className="mt-10 text-sm leading-relaxed text-ink-3">
          Posts are members&apos; own views, not medical advice. Read the{" "}
          <Link href="/community-guidelines" className="underline underline-offset-4">
            community guidelines
          </Link>
          .
        </p>
      </div>
    </div>
  );
}
