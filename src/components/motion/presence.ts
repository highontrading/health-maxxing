"use client";

import { useEffect, useState } from "react";

/**
 * Keeps something mounted while it animates out.
 *
 *   const menu = usePresence(open);
 *   {menu.mounted && <div className="motion-menu" data-state={menu.state}>...</div>}
 *
 * `state` is "open" or "closed"; the `motion-*` classes (styles/motion/utilities.css)
 * play the way in for "open" and the way out for "closed". `exitMs` must be at
 * least as long as the exit animation: 140 covers motion-menu, motion-dialog
 * and motion-fade; use 220 for motion-sheet.
 */
export function usePresence(open: boolean, exitMs = 140): { mounted: boolean; state: "open" | "closed" } {
  const [mounted, setMounted] = useState(open);
  // Opening is immediate: adjust during render instead of waiting for an effect.
  if (open && !mounted) setMounted(true);
  useEffect(() => {
    if (open || !mounted) return;
    const timer = window.setTimeout(() => setMounted(false), exitMs);
    return () => window.clearTimeout(timer);
  }, [open, mounted, exitMs]);
  return { mounted: open || mounted, state: open ? "open" : "closed" };
}
