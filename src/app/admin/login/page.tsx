import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { SignInForm } from "@/components/auth/AuthForms";
import { Sticker } from "@/components/stickers/Sticker";
import { getSessionUser, isStaff } from "@/lib/auth";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Staff sign in" };

export default function AdminLoginPage() {
  return (
    <PageTransition>
      <main className="flex min-h-dvh items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="mb-6 flex flex-col items-center text-center">
            <Sticker name="heart" size={72} rotate={-8} />
            <h1 className="display display-md mt-4">Staff sign in</h1>
            <p className="mt-2 text-ink-2">The Health Maxxing admin panel is for editors and admins.</p>
          </div>
          <div className="admin-card p-6">
            <Suspense fallback={null}>
              <AlreadySignedIn />
            </Suspense>
            <SignInForm area="admin" />
          </div>
          <p className="mt-5 text-center text-sm text-ink-3">
            <Link href="/" className="underline underline-offset-4 transition-colors duration-(--dur-fast) hover:text-ink">
              Back to the site
            </Link>
          </p>
        </div>
      </main>
    </PageTransition>
  );
}

/** Staff who are already signed in go straight to the dashboard. */
async function AlreadySignedIn() {
  const user = await getSessionUser();
  if (isStaff(user)) redirect("/admin");
  if (!user) return null;
  return (
    <p className="mb-4 rounded-2xl bg-[var(--yellow-soft)] px-4 py-3 text-sm font-medium text-[var(--yellow-ink)]">
      You are signed in as @{user.handle}, which is not a staff account. Sign in with a staff account to continue.
    </p>
  );
}
