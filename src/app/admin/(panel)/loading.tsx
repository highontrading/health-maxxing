import { PageTransition } from "@/components/motion/PageTransition";

/** Shown at once while an admin page loads its data. */
export default function AdminLoading() {
  return (
    <PageTransition variant="panel-skeleton">
      <div className="space-y-4" aria-busy="true" aria-label="Loading">
        <div className="skeleton h-10 w-72 max-w-full rounded-full" />
        <div className="skeleton h-5 w-96 max-w-full rounded-full" />
        <div className="skeleton h-28 rounded-[20px]" />
        <div className="skeleton h-80 rounded-[20px]" />
      </div>
    </PageTransition>
  );
}
