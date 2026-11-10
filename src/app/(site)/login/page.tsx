import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "@/components/auth/AuthForms";
import { Sticker } from "@/components/stickers/Sticker";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default function LoginPage() {
  return (
    <main className="bg-sand">
      <div className="container-hm flex justify-center py-12 md:py-20">
        <div className="relative w-full max-w-md rounded-[30px] border-[1.5px] border-ink bg-paper p-7 shadow-[0_8px_0_var(--ink)] md:p-9">
          <Sticker name="smile" size={76} rotate={10} className="absolute -right-4 -top-7" />
          <p className="eyebrow text-ink-3">Welcome back</p>
          <h1 className="display display-md mt-3">
            Sign <span className="serif-accent">in.</span>
          </h1>
          <div className="mt-7">
            <SignInForm />
          </div>
          <p className="mt-6 text-[0.9375rem] text-ink-2">
            New here?{" "}
            <Link href="/signup" className="font-semibold text-ink underline underline-offset-4">
              Create an account
            </Link>
          </p>
          <p className="mt-2 text-sm text-ink-3">
            Forgotten your password?{" "}
            <Link href="/contact" className="underline underline-offset-4">
              Contact us
            </Link>{" "}
            and we will help you back in.
          </p>
        </div>
      </div>
    </main>
  );
}
