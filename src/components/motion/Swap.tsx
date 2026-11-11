"use client";

import type { ReactNode } from "react";

/**
 * A quiet arrival for content that replaces a placeholder inside a page:
 *
 *   <Suspense fallback={<ListSkeleton />}>
 *     <Swap><List /></Swap>
 *   </Suspense>
 *
 * It is a plain fade, not a view transition: a view transition would pause
 * clicks on the whole page for a moment, just when the visitor reaches for
 * the form or list that has appeared. The class is dropped once the fade has
 * played, so it does not play again when the visitor comes back to the page.
 */
export function Swap({ children }: { children: ReactNode }) {
  return (
    <div className="swap-in" onAnimationEnd={(e) => e.target === e.currentTarget && e.currentTarget.classList.remove("swap-in")}>
      {children}
    </div>
  );
}
