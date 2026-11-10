"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/**
 * Fades `.reveal` elements in as they scroll into view. Mounted once in the
 * site layout; re-scans after each navigation. Elements already on screen are
 * marked visible before hiding is switched on, so nothing flickers.
 */
export function RevealObserver() {
  const pathname = usePathname();
  useEffect(() => {
    const root = document.documentElement;
    const els = Array.from(document.querySelectorAll<HTMLElement>(".reveal:not(.is-in)"));
    if (!els.length) return;
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      els.forEach((el) => el.classList.add("is-in"));
      return;
    }
    const vh = window.innerHeight;
    for (const el of els) {
      const rect = el.getBoundingClientRect();
      if (rect.top < vh && rect.bottom > 0) el.classList.add("is-in");
    }
    root.classList.add("reveal-ready");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-in");
            io.unobserve(entry.target);
          }
        }
      },
      { rootMargin: "0px 0px -6% 0px", threshold: 0.05 },
    );
    els.filter((el) => !el.classList.contains("is-in")).forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);
  return null;
}
