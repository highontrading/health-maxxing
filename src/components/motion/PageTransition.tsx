import { ViewTransition, type ReactNode } from "react";

/**
 * Page changes. Every `page.tsx` wraps what it returns in <PageTransition>, so
 * the old page fades out and the new one fades in when a visitor follows a
 * link. It must sit in the page, not in a layout: layouts stay mounted, so
 * they never enter or leave. The animations are CSS, in
 * `src/app/styles/motion/page-transitions.css`.
 *
 * - `page` (default): public pages. Links tagged with
 *   `transitionTypes={["nav-forward"]}` or `["nav-back"]` slide a little in
 *   that direction instead of rising.
 * - `skeleton`: the placeholder a public page shows while its content loads.
 *   It stays invisible for the first quarter second, so a page that loads
 *   quickly reads as one cross-fade instead of page, skeleton, page; it is a
 *   full screen tall, so the footer never jumps into view while it shows; and
 *   it leaves quietly, so the real content gets the entrance.
 * - `panel`: admin pages, a plain quick cross-fade. Wraps the page in a <div>
 *   so its many top-level blocks move as one.
 * - `panel-skeleton`: the admin loading placeholder, also invisible at first.
 *
 * A page with a loading state uses both:
 *
 *   <Suspense fallback={<PageTransition variant="skeleton"><Skeleton /></PageTransition>}>
 *     <PageTransition><Content /></PageTransition>
 *   </Suspense>
 *
 * Nothing animates on the first load, on browser back and forward, on
 * `router.refresh()`, or when only the query string changes.
 */
export function PageTransition({ children, variant = "page" }: { children: ReactNode; variant?: "page" | "skeleton" | "panel" | "panel-skeleton" }) {
  if (variant === "skeleton" || variant === "panel-skeleton") {
    return (
      <ViewTransition enter="skeleton-enter" exit="skeleton-exit" default="none">
        <div className={variant === "skeleton" ? "page-skeleton page-skeleton-tall" : "page-skeleton"}>{children}</div>
      </ViewTransition>
    );
  }
  if (variant === "panel") {
    return (
      <ViewTransition enter="panel-enter" exit="panel-exit" default="none">
        <div>{children}</div>
      </ViewTransition>
    );
  }
  return (
    <ViewTransition
      enter={{ "nav-forward": "page-forward", "nav-back": "page-back", default: "page-enter" }}
      exit={{ "nav-forward": "page-forward", "nav-back": "page-back", default: "page-exit" }}
      default="none"
    >
      {children}
    </ViewTransition>
  );
}

/**
 * A quiet hand-over inside a page: wrap a Suspense fallback and the content
 * that replaces it, and the placeholder fades out while the content fades in.
 *
 *   <Suspense fallback={<Swap><ListSkeleton /></Swap>}>
 *     <Swap><List /></Swap>
 *   </Suspense>
 *
 * Give it one child element. It only animates the hand-over; it does nothing
 * on its own when the page itself is entering.
 */
export function Swap({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="swap-enter" exit="swap-exit" default="none">
      {children}
    </ViewTransition>
  );
}

/**
 * Wraps the root element of a layout. A page's own <PageTransition> does not
 * play when the layout around it is added or removed in the same step (going
 * from the public site into the admin panel, or signing in to it): then the
 * layout is the outermost thing that changes, and this is what animates.
 * While the visitor stays inside the layout it does nothing.
 */
export function LayoutTransition({ children }: { children: ReactNode }) {
  return (
    <ViewTransition enter="panel-enter" exit="panel-exit" default="none">
      {children}
    </ViewTransition>
  );
}
