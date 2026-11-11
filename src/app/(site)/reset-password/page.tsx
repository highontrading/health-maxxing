import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/auth/AuthForms";
import { Sticker } from "@/components/stickers/Sticker";
import { PageTransition } from "@/components/motion/PageTransition";
import { stagger } from "@/components/motion/stagger";

export const metadata: Metadata = { title: "Choose a new password", robots: { index: false } };

export default function ResetPasswordPage() {
  return (
    <PageTransition>
      <main className="bg-sand">
        <div className="container-hm flex justify-center py-12 md:py-20">
          <div className="relative w-full max-w-md rounded-[30px] border-[1.5px] border-ink bg-paper p-7 shadow-[0_8px_0_var(--ink)] md:p-9">
            <Sticker name="check" size={76} rotate={-10} className="enter-pop absolute -right-2 -top-7 sm:-right-4" style={stagger(3)} />
            <p className="eyebrow text-ink-3">Almost there</p>
            <h1 className="display display-md mt-3">
              Choose a new <span className="serif-accent">password.</span>
            </h1>
            <div className="mt-6">
              <ResetPasswordForm />
            </div>
          </div>
        </div>
      </main>
    </PageTransition>
  );
}
