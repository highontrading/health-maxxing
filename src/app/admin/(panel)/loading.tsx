/** Shown at once while an admin page loads its data. */
export default function AdminLoading() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading">
      <div className="h-10 w-72 max-w-full animate-pulse rounded-full bg-sand-2" />
      <div className="h-5 w-96 max-w-full animate-pulse rounded-full bg-sand-2" />
      <div className="h-28 animate-pulse rounded-[20px] bg-sand-2" />
      <div className="h-80 animate-pulse rounded-[20px] bg-sand-2" />
    </div>
  );
}
