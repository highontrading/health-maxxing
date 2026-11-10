import { cn } from "@/lib/cn";

/**
 * A menu button icon: three bars that fold into a cross when `open`. The
 * button around it carries the label and aria-expanded; this is decoration.
 */
export function MenuToggleIcon({ open, size = 22, className }: { open: boolean; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      aria-hidden="true"
      data-open={open ? "true" : "false"}
      className={cn("menu-toggle-icon", className)}
    >
      <line x1="4" y1="7" x2="20" y2="7" />
      <line x1="4" y1="12" x2="20" y2="12" />
      <line x1="4" y1="17" x2="20" y2="17" />
    </svg>
  );
}
