import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "@/components/auth/AuthForms";
import { Sticker } from "@/components/stickers/Sticker";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default function SignUpPage() {
  return (
    <main className="bg-sand">
      <div className="container-hm flex justify-center py-12 md:py-20">
        <div className="relative w-full max-w-lg rounded-[30px] border-[1.5px] border-ink bg-paper p-7 shadow-[0_8px_0_var(--ink)] md:p-9">
          <Sticker name="star" size={76} rotate={-10} className="absolute -right-2 -top-7 sm:-right-4" />
          <p className="eyebrow text-ink-3">Join the community</p>
          <h1 className="display display-md mt-3">
            Create an <span className="serif-accent">account.</span>
          </h1>
          <p className="mt-3 text-[0.9375rem] text-ink-2">Free. You only need one to post in the community: everything else on the site is open.</p>
          <div className="mt-7">
            <SignUpForm />
          </div>
          <p className="mt-6 text-[0.9375rem] text-ink-2">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-ink underline underline-offset-4">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
