"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Props = {
  children: ReactNode;
  /** Classes and style for the outer box: where it sits, and how it arrives. */
  className?: string;
  style?: CSSProperties;
  /** Seconds for one slow bob up and down. Leave out for a sticker that sits still. */
  float?: number;
  /** Where in the bob to start, in seconds (negative), so neighbors are out of step. */
  floatDelay?: number;
};

/**
 * Lets mouse and pen users drag an element around, sticker-sheet style.
 * Touch input is left alone so the page still scrolls. A drag cancels the
 * click that would otherwise follow, so stickers can also be links.
 *
 * Three nested boxes, one job each (styles in `styles/motion/home.css`): the
 * outer one is moved by the drag, the body lifts while held and settles when
 * dropped, the innermost one floats. The float must not sit on the box the
 * drag moves: a running animation wins over an inline style for the same
 * property, so the sticker would bob in place instead of following the pointer.
 */
export function Draggable({ children, className, style, float, floatDelay = 0 }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef({ x: 0, y: 0, startX: 0, startY: 0, active: false, moved: false });

  const drop = (el: HTMLDivElement) => {
    s.current.active = false;
    el.style.cursor = "";
    el.dataset.drag = "dropped";
  };

  return (
    <div
      ref={ref}
      className={cn("draggable select-none", className)}
      style={style}
      onPointerDown={(e) => {
        if (e.pointerType === "touch" || e.button !== 0) return;
        s.current.active = true;
        s.current.moved = false;
        s.current.startX = e.clientX - s.current.x;
        s.current.startY = e.clientY - s.current.y;
        e.currentTarget.setPointerCapture(e.pointerId);
        e.currentTarget.style.zIndex = "30";
        e.currentTarget.style.cursor = "grabbing";
        e.currentTarget.dataset.drag = "held";
      }}
      onPointerMove={(e) => {
        if (!s.current.active) return;
        const x = e.clientX - s.current.startX;
        const y = e.clientY - s.current.startY;
        if (Math.abs(x - s.current.x) + Math.abs(y - s.current.y) > 3) s.current.moved = true;
        s.current.x = x;
        s.current.y = y;
        e.currentTarget.style.translate = `${x}px ${y}px`;
      }}
      onPointerUp={(e) => {
        if (!s.current.active) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        drop(e.currentTarget);
      }}
      onPointerCancel={(e) => {
        if (s.current.active) drop(e.currentTarget);
      }}
      onClickCapture={(e) => {
        if (s.current.moved) {
          e.preventDefault();
          e.stopPropagation();
          s.current.moved = false;
        }
      }}
      onDragStart={(e) => e.preventDefault()}
    >
      <div
        className="draggable-body"
        onAnimationEnd={(e) => {
          // Settled: back to rest, so the settle cannot replay when the page is shown again.
          if (e.target === e.currentTarget && e.animationName === "draggable-settle") delete ref.current?.dataset.drag;
        }}
      >
        {float ? (
          <div className="draggable-float" style={{ "--float": `${float}s`, "--float-delay": `${floatDelay}s` } as CSSProperties}>
            {children}
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
