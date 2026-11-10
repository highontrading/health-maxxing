import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { signOutAction } from "@/app/actions/auth";
import { PasswordForm, ProfileForm } from "@/components/auth/AuthForms";
import { Icon } from "@/components/Icon";
import { isStaff, requireUser } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { formatDate } from "@/lib/format";

export const metadata: Metadata = { title: "Your account", robots: { index: false } };

export default function AccountPage() {
  return (
    <main className="bg-sand">
      <div className="container-narrow py-10 md:py-16">
        <p className="eyebrow text-ink-3">Your account</p>
        <Suspense fallback={<div className="mt-6 h-96 animate-pulse rounded-[28px] bg-paper" aria-busy="true" />}>
          <Account />
        </Suspense>
      </div>
    </main>
  );
}

async function Account() {
  const user = await requireUser("/account");
  const [profile, threads] = await Promise.all([
    queryOne<{ bio: string; created_at: string }>("SELECT bio, created_at FROM users WHERE id = ?", [user.id]),
    query<{ id: number; title: string; reply_count: number }>(
      "SELECT id, title, reply_count FROM forum_threads WHERE user_id = ? AND hidden = 0 ORDER BY created_at DESC LIMIT 8",
      [user.id],
    ),
  ]);
  return (
    <>
      <h1 className="display display-md mt-4">
        Hello, <span className="serif-accent">{user.name}.</span>
      </h1>
      <p className="mt-2 text-ink-3">
        @{user.handle} · {user.email} · joined {formatDate(profile?.created_at)}
      </p>
      {user.banned && <p className="mt-4 rounded-2xl bg-[var(--pink-soft)] p-4 font-medium text-[var(--pink-ink)]">Your account is suspended, so you cannot post in the community.</p>}

      <div className="mt-8 grid gap-5">
        {isStaff(user) && (
          <Link href="/admin" className="flex items-center justify-between rounded-[22px] bg-ink p-5 text-paper">
            <span>
              <span className="eyebrow text-lime">Staff</span>
              <span className="mt-1 block text-xl font-medium">Open the admin panel</span>
            </span>
            <Icon name="arrow-right" size={22} />
          </Link>
        )}
        <section className="rounded-[26px] bg-paper p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Profile</h2>
          <div className="mt-5">
            <ProfileForm user={{ name: user.name, bio: profile?.bio ?? "", sticker: user.sticker, color: user.color }} />
          </div>
        </section>

        <section className="rounded-[26px] bg-paper p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Your threads</h2>
          {threads.length ? (
            <ul className="mt-4 divide-y divide-line">
              {threads.map((t) => (
                <li key={t.id}>
                  <Link href={`/community/t/${t.id}`} className="flex items-center justify-between gap-4 py-3 font-medium hover:underline">
                    <span className="min-w-0 truncate">{t.title}</span>
                    <span className="flex-none text-sm text-ink-3">{t.reply_count} replies</span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-ink-2">
              You have not started a thread yet.{" "}
              <Link href="/community/new" className="font-semibold text-ink underline underline-offset-4">
                Start one
              </Link>
              .
            </p>
          )}
          <Link href="/saved" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold underline-offset-4 hover:underline">
            <Icon name="bookmark" size={15} /> Your saved reads
          </Link>
        </section>

        <section className="rounded-[26px] bg-paper p-6 md:p-8">
          <h2 className="text-xl font-semibold tracking-[-0.02em]">Password</h2>
          <div className="mt-5 max-w-sm">
            <PasswordForm minLength={user.role === "member" ? 8 : 10} />
          </div>
        </section>

        <form action={signOutAction}>
          <button type="submit" className="btn btn-outline">
            <Icon name="logout" size={16} /> Sign out
          </button>
        </form>
        <p className="text-sm text-ink-3">
          To delete your account and data,{" "}
          <Link href="/contact" className="underline underline-offset-4">
            contact us
          </Link>
          .
        </p>
      </div>
    </>
  );
}
