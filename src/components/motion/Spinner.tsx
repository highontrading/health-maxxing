import { cn } from "@/lib/cn";

/** A small "working" indicator for buttons and status lines. Pair it with text: it is hidden from screen readers. */
export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className={cn("inline-block flex-none animate-spin", className)}>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth={3} opacity={0.25} />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
    </svg>
  );
}
