import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Opens and closes with a smooth change of height (answers, "show more",
 * optional form sections). The content stays in the page, so it is readable
 * without JavaScript when rendered open, and it is hidden from the keyboard
 * and from screen readers while closed.
 */
export function Collapse({ open, children, id, className }: { open: boolean; children: ReactNode; id?: string; className?: string }) {
  return (
    <div id={id} className={cn("collapse-y", className)} data-open={open ? "true" : "false"} inert={!open}>
      <div>{children}</div>
    </div>
  );
}
