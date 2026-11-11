"use client";

import { useEffect } from "react";

/**
 * Bars that already show their final state from the first frame of a page
 * change. They look ready, so a click on them should count.
 */
const STEADY = ".vt-site-header, .vt-site-notice, .vt-admin-bar, .vt-steady";

/**
 * While one page fades into the next, the browser is showing pictures of the
 * page and every click lands on the document itself. That window is a fraction
 * of a second, but it is exactly when a visitor who picked the wrong menu item
 * clicks the right one. This remembers such a click and, once the transition
 * is over, passes it to the link or button under the pointer if that is in one
 * of the steady bars. Clicks on the changing page are not replayed: what was
 * under the pointer there is gone. Mounted once in each root layout.
 */
export function TransitionClicks() {
  useEffect(() => {
    let supported = true;
    const transitionRunning = () => {
      if (!supported) return false;
      try {
        return document.documentElement.matches(":active-view-transition");
      } catch {
        supported = false; // a browser that does not know the selector
        return false;
      }
    };
    const onClick = (event: MouseEvent) => {
      if (!event.isTrusted || event.target !== document.documentElement || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!transitionRunning()) return;
      const { clientX, clientY } = event;
      const started = performance.now();
      const replay = () => {
        if (transitionRunning()) {
          if (performance.now() - started < 1500) requestAnimationFrame(replay);
          return;
        }
        const target = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>("a[href], button");
        if (target?.closest(STEADY)) target.click();
      };
      requestAnimationFrame(replay);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);
  return null;
}
