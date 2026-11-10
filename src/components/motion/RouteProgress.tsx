"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useLayoutEffect, useRef } from "react";
import { routeProgress } from "@/lib/route-progress";

/**
 * A thin bar under the top edge while a page is being fetched. Most page
 * changes here are instant and never show it: it waits 180 ms before it
 * appears (see `.route-progress` in styles/motion/utilities.css). Mount once
 * per root layout area.
 */
export function RouteProgress() {
  const bar = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const paint = (state: string) => {
      if (bar.current) bar.current.dataset.state = state;
    };
    paint(routeProgress.get());
    return routeProgress.subscribe(paint);
  }, []);
  return (
    <>
      {/* The address is only known at request time on some routes, so it is read behind its own boundary. */}
      <Suspense fallback={null}>
        <Arrived />
      </Suspense>
      <div ref={bar} className="route-progress" data-state="idle" aria-hidden="true" />
    </>
  );
}

/** Ends the progress bar in the same frame the new address is committed. */
function Arrived() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  useLayoutEffect(() => {
    routeProgress.done();
  }, [pathname, search]);
  return null;
}
