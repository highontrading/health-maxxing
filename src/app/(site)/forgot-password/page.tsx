import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "@/components/auth/AuthForms";
import { Sticker } from "@/components/stickers/Sticker";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Reset your password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <PageTransition>
      <main className="bg-sand">
        <div className="container-hm flex justify-center py-12 md:py-20">
          <div className="relative w-full max-w-md rounded-[30px] border-[1.5px] border-ink bg-paper p-7 shadow-[0_8px_0_var(--ink)] md:p-9">
            <Sticker name="shield" size={76} rotate={10} className="absolute -right-2 -top-7 sm:-right-4" />
            <p className="eyebrow text-ink-3">It happens</p>
            <h1 className="display display-md mt-3">
              Reset your <span className="serif-accent">password.</span>
            </h1>
            <p className="mt-3 text-ink-2">Enter the email you signed up with and we will send a link that lets you choose a new password.</p>
            <div className="mt-6">
              <ForgotPasswordForm />
            </div>
            <p className="mt-6 text-[0.9375rem] text-ink-2">
              Remembered it?{" "}
              <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
