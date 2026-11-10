"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A number that counts up the first time it scrolls into view. The real value
 * is in the HTML from the start, so it reads correctly without JavaScript, to
 * search engines and under reduced motion. A number that is already on screen
 * when the page opens stays as it is: resetting it to zero would flash.
 */
export function CountUp({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = value.toLocaleString("en-US");

  useEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node || value < 2 || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let first = true;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.some((entry) => entry.isIntersecting);
        if (first) {
          first = false;
          if (visible) observer.disconnect();
          return;
        }
        if (!visible) return;
        observer.disconnect();
        const started = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - started) / duration);
          const eased = 1 - (1 - progress) ** 3;
          node.nodeValue = progress < 1 ? Math.round(value * eased).toLocaleString("en-US") : text;
          if (progress < 1) frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
      node.nodeValue = text;
    };
  }, [value, duration, text]);

  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {text}
    </span>
  );
}
