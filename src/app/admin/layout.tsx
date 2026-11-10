import type { Metadata } from "next";
import type { ReactNode } from "react";

/**
 * Every admin page reads the session, so none of them can prerender a useful
 * static shell. Opting the subtree out of that validation is the documented
 * route for sign-in-only areas.
 */
export const instant = false;

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · Health Maxxing admin" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-dvh bg-sand text-ink">{children}</div>;
}
