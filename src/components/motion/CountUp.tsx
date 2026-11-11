"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { cn } from "@/lib/cn";

/**
 * A whole number that counts up the first time it scrolls into view. The real
 * value is in the HTML from the start, so it reads correctly without
 * JavaScript, to search engines and under reduced motion. A number that is
 * already on screen when the page opens stays as it is: resetting it to zero
 * would flash. While it counts it keeps the width of the final number, so its
 * neighbours do not shuffle. Numbers with decimals are shown as they are.
 */
export function CountUp({ value, duration = 900, className }: { value: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const text = value.toLocaleString("en-US");
  // The newest text, for the clean-up below: an effect's clean-up would
  // otherwise put back the text of the render it was created in.
  const latest = useRef(text);
  useLayoutEffect(() => {
    latest.current = text;
  });

  useEffect(() => {
    const el = ref.current;
    const node = el?.firstChild;
    if (!el || !node || value < 2 || !Number.isInteger(value) || !("IntersectionObserver" in window)) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let frame = 0;
    let first = true;
    const settle = () => {
      cancelAnimationFrame(frame);
      node.nodeValue = latest.current;
      el.style.minWidth = "";
    };
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
        el.style.minWidth = `${el.getBoundingClientRect().width}px`;
        const started = performance.now();
        const tick = (now: number) => {
          const progress = Math.min(1, (now - started) / duration);
          if (progress >= 1) return settle();
          const eased = 1 - (1 - progress) ** 3;
          node.nodeValue = Math.round(value * eased).toLocaleString("en-US");
          frame = requestAnimationFrame(tick);
        };
        frame = requestAnimationFrame(tick);
      },
      { threshold: 0.6 },
    );
    observer.observe(el);
    return () => {
      observer.disconnect();
      settle();
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={cn("inline-block tabular-nums", className)}>
      {text}
    </span>
  );
}
