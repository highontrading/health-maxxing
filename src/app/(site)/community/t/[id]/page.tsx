import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { AuthorName, Avatar } from "@/components/forum/ForumBits";
import { DeletePostButton, LikeButton, ReplyForm, ReportButton } from "@/components/forum/ForumClient";
import { Icon } from "@/components/Icon";
import { getSessionUser, isStaff } from "@/lib/auth";
import { getSettings } from "@/lib/data";
import { run } from "@/lib/db";
import { getThread, hasLiked, listPosts, timeAgo } from "@/lib/forum";
import { renderUserText } from "@/lib/markdown";

type Props = PageProps<"/community/t/[id]">;

export const metadata: Metadata = { title: "Community thread", robots: { index: true, follow: true } };

export default function ThreadPage({ params }: Props) {
  return (
    <main>
      <Suspense fallback={<div className="min-h-[60vh] animate-pulse bg-sand" aria-busy="true" />}>
        <ThreadView params={params} />
      </Suspense>
    </main>
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
  const now = Date.now();
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
          <footer className="mt-6 flex flex-wrap items-center gap-2">
            <LikeButton type="thread" id={thread.id} count={thread.likeCount} liked={liked} disabled={!user} />
            {user && <ReportButton type="thread" id={thread.id} />}
          </footer>
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
                <footer className="mt-4 flex flex-wrap items-center gap-2">
                  <LikeButton type="post" id={post.id} count={post.likeCount} liked={post.liked} disabled={!user} />
                  {user && post.author.id !== user.id && <ReportButton type="post" id={post.id} />}
                  {user && (post.author.id === user.id || staff) && <DeletePostButton id={post.id} />}
                </footer>
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
