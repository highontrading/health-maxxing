import { Suspense, type ReactNode } from "react";
import { AdminFrame } from "@/components/admin/AdminFrame";
import { getNavCounts } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";

export default function PanelLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<PanelSkeleton />}>
      <Panel>{children}</Panel>
    </Suspense>
  );
}

/** Signed-out visitors and members are sent to the staff sign-in page. */
async function Panel({ children }: { children: ReactNode }) {
  const user = await requireStaff();
  const counts = await getNavCounts();
  return (
    <AdminFrame user={{ name: user.name, handle: user.handle, role: user.role, sticker: user.sticker, color: user.color }} counts={counts}>
      {children}
    </AdminFrame>
  );
}

function PanelSkeleton() {
  return (
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[256px_minmax(0,1fr)]" aria-busy="true">
      <div className="hidden border-r border-line bg-paper lg:block" />
      <div className="mx-auto w-full max-w-[1280px] space-y-4 px-4 py-10 sm:px-6 lg:px-8">
        <div className="h-10 w-64 animate-pulse rounded-full bg-sand-2" />
        <div className="h-40 animate-pulse rounded-[20px] bg-sand-2" />
        <div className="h-72 animate-pulse rounded-[20px] bg-sand-2" />
      </div>
    </div>
  );
}
