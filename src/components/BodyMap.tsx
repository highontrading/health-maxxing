"use client";

import Link from "next/link";
import { useState } from "react";
import { Sticker } from "@/components/stickers/Sticker";
import { cn } from "@/lib/cn";

export type MapSystem = { slug: string; name: string; sticker: string; color: string; conditionCount: number };

/**
 * Where each label sits (in the 760 x 620 drawing) and the point on the
 * figure it refers to. Left-side labels end at x = 214, right-side start at 546.
 */
const LAYOUT: Record<string, { side: "left" | "right"; y: number; point: [number, number] }> = {
  "brain-nerves": { side: "left", y: 44, point: [368, 34] },
  "eyes-ears-mouth": { side: "left", y: 112, point: [362, 78] },
  "lungs-breathing": { side: "left", y: 184, point: [352, 184] },
  digestive: { side: "left", y: 256, point: [372, 262] },
  "kidneys-urinary": { side: "left", y: 328, point: [350, 302] },
  "skin-hair-nails": { side: "left", y: 400, point: [300, 318] },
  "bones-joints-muscles": { side: "left", y: 480, point: [346, 474] },
  "mental-health": { side: "right", y: 44, point: [406, 44] },
  "hormones-metabolism": { side: "right", y: 112, point: [386, 108] },
  "heart-circulation": { side: "right", y: 184, point: [398, 180] },
  "immune-infections": { side: "right", y: 256, point: [432, 204] },
  "womens-reproductive": { side: "right", y: 328, point: [392, 330] },
  "mens-reproductive": { side: "right", y: 400, point: [380, 346] },
};

const W = 760;
const H = 620;
const INK = "#262422";

function Figure() {
  const body = (
    <>
      <circle cx="380" cy="62" r="40" />
      <rect x="366" y="92" width="28" height="30" />
      <path d="M322 118 H438 a26 26 0 0 1 26 26 L448 300 Q445 332 446 348 H314 Q315 332 312 300 L296 144 a26 26 0 0 1 26 -26 Z" />
    </>
  );
  const limbs = "M310 146 L290 250 L296 334 M450 146 L470 250 L464 334";
  const legs = "M348 344 L346 474 L344 590 M412 344 L414 474 L416 590";
  return (
    <g>
      {/* Outline pass */}
      <g fill="none" stroke={INK} strokeLinecap="round" strokeLinejoin="round">
        <path d={limbs} strokeWidth="41" />
        <path d={legs} strokeWidth="55" />
      </g>
      <g fill="#fff" stroke={INK} strokeWidth="7" strokeLinejoin="round">
        {body}
      </g>
      {/* Fill pass */}
      <g fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round">
        <path d={limbs} strokeWidth="34" />
        <path d={legs} strokeWidth="48" />
      </g>
      <g fill="#fff">{body}</g>
      {/* Face */}
      <circle cx="366" cy="58" r="3.4" fill={INK} />
      <circle cx="394" cy="58" r="3.4" fill={INK} />
      <path d="M369 74 Q380 83 391 74" fill="none" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
    </g>
  );
}

/**
 * An anatomy-chart style map: sticker labels wired to a figure.
 *
 * Hovering or focusing a label lights it up: a solid line is drawn to its
 * point on the figure, the dot grows, the label lifts and the others dim. The
 * component only says which label is active (data-hot on the map, data-on on
 * the label and its wire); how that looks and moves is in
 * `styles/motion/home.css`, under "Body map".
 */
export function BodyMap({ systems, className }: { systems: MapSystem[]; className?: string }) {
  const [active, setActive] = useState<string | null>(null);
  const placed = systems.filter((s) => LAYOUT[s.slug]);

  return (
    <div className={cn("body-map relative mx-auto w-full max-w-[860px]", className)} style={{ aspectRatio: `${W} / ${H}` }} data-hot={active ? "" : undefined}>
      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 size-full" aria-hidden="true" focusable="false">
        <ellipse cx="380" cy="604" rx="96" ry="9" fill="rgba(38,36,34,0.1)" />
        <Figure />
        {placed.map((s) => {
          const l = LAYOUT[s.slug];
          const [px, py] = l.point;
          const lx = l.side === "left" ? 218 : 542;
          const mid = l.side === "left" ? lx + 34 : lx - 34;
          const d = `M${lx} ${l.y} H${mid} L${px} ${py}`;
          return (
            <g
              key={s.slug}
              className={`body-map-wire tone-${s.color}`}
              data-on={active === s.slug ? "" : undefined}
              fill="none"
              stroke={INK}
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d={d} strokeWidth="1.6" strokeDasharray="2 5" />
              {/* Shown only while active. pathLength 1 lets the stylesheet draw it without knowing its length. */}
              <path d={d} className="body-map-wire-on" strokeWidth="3" pathLength={1} />
              <circle className="body-map-dot" cx={px} cy={py} r="6" fill="var(--tone-solid)" strokeWidth="2.4" />
            </g>
          );
        })}
      </svg>
      {placed.map((s) => {
        const l = LAYOUT[s.slug];
        return (
          <Link
            key={s.slug}
            href={`/body/${s.slug}`}
            onPointerEnter={() => setActive(s.slug)}
            onPointerLeave={() => setActive(null)}
            onFocus={() => setActive(s.slug)}
            onBlur={() => setActive(null)}
            data-on={active === s.slug ? "" : undefined}
            className={cn(
              `tone-${s.color}`,
              "body-map-label absolute flex max-w-[27%] items-center gap-2 rounded-full border-[1.5px] border-ink py-1 text-left text-[clamp(0.6875rem,1.35vw,0.875rem)] font-semibold leading-tight",
              l.side === "left" ? "flex-row-reverse pl-3 pr-1 text-right" : "pl-1 pr-3",
            )}
            style={
              l.side === "left"
                ? { right: `${((W - 216) / W) * 100}%`, top: `${(l.y / H) * 100}%` }
                : { left: `${(544 / W) * 100}%`, top: `${(l.y / H) * 100}%` }
            }
          >
            <span className="flex size-[clamp(26px,3.6vw,36px)] flex-none items-center justify-center rounded-full bg-tone-soft">
              <Sticker name={s.sticker} size="78%" flat style={{ height: "auto", aspectRatio: "1 / 1" }} />
            </span>
            <span className="min-w-0">{s.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
