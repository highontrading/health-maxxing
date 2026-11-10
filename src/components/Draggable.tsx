"use client";

import { useRef, type CSSProperties, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Lets mouse and pen users drag an element around, sticker-sheet style.
 * Touch input is left alone so the page still scrolls. A drag cancels the
 * click that would otherwise follow, so stickers can also be links.
 */
export function Draggable({ children, className, style }: { children: ReactNode; className?: string; style?: CSSProperties }) {
  const ref = useRef<HTMLDivElement>(null);
  const s = useRef({ x: 0, y: 0, startX: 0, startY: 0, active: false, moved: false });

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
      }}
      onPointerMove={(e) => {
        if (!s.current.active) return;
        const x = e.clientX - s.current.startX;
        const y = e.clientY - s.current.startY;
        if (Math.abs(x - s.current.x) + Math.abs(y - s.current.y) > 3) s.current.moved = true;
        s.current.x = x;
        s.current.y = y;
        e.currentTarget.style.translate = `${x}px ${y}px`;
        e.currentTarget.style.scale = "1.08";
      }}
      onPointerUp={(e) => {
        if (!s.current.active) return;
        s.current.active = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
        e.currentTarget.style.cursor = "";
        e.currentTarget.style.scale = "";
      }}
      onPointerCancel={(e) => {
        s.current.active = false;
        e.currentTarget.style.cursor = "";
        e.currentTarget.style.scale = "";
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
      {children}
    </div>
  );
}
