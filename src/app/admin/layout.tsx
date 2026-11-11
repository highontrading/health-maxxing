import type { Metadata } from "next";
import type { ReactNode } from "react";
import { LayoutTransition } from "@/components/motion/PageTransition";
import { RouteProgress } from "@/components/motion/RouteProgress";
import { TransitionClicks } from "@/components/motion/TransitionClicks";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Health Maxxing admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutTransition>
      <div className="admin-root min-h-dvh bg-sand text-ink">
        <RouteProgress />
        <TransitionClicks />
        {children}
      </div>
    </LayoutTransition>
  );
}
