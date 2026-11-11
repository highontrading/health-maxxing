import { Suspense, type ReactNode } from "react";
import { AdminFrame, AdminNav, AdminNavSkeleton } from "@/components/admin/AdminFrame";
import { LayoutTransition } from "@/components/motion/PageTransition";
import { getNavCounts } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";

/**
 * The frame renders at once and each page loads behind its own loading state.
 * The session is read in the menu and again in every page, never at the top of
 * this layout, so the layout itself never blocks or goes stale.
 */
export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <LayoutTransition>
      <AdminFrame
        nav={
          <Suspense fallback={<AdminNavSkeleton />}>
            <Menu />
          </Suspense>
        }
      >
        {children}
      </AdminFrame>
    </LayoutTransition>
  );
}

/** Signed-out visitors and members are sent to the staff sign-in page. */
async function Menu() {
  const user = await requireStaff();
  const counts = await getNavCounts();
  return <AdminNav user={{ name: user.name, handle: user.handle, role: user.role, sticker: user.sticker, color: user.color }} counts={counts} />;
}
