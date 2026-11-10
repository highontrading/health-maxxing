/**
 * Sticker artwork. Every sticker is drawn in a 100 x 100 box, keeping to
 * roughly 12..88 so the white die-cut border (added by <Sticker>) has room.
 *
 * Conventions:
 * - K is the outline colour. `sk` is the standard outline stroke.
 * - <U fill> draws overlapping shapes as one silhouette (outline behind, fill on top).
 * - className "ln" marks stroke-only details so the die-cut pass does not fill them.
 * - className "ln-fat" marks thick coloured strokes (tubes, ribbons, handles).
 */
import type { ReactNode } from "react";

const K = "#262422";
const sk = { stroke: K, strokeWidth: 3.6, strokeLinejoin: "round", strokeLinecap: "round" } as const;
const thin = { stroke: K, strokeWidth: 2.8, strokeLinejoin: "round", strokeLinecap: "round", fill: "none" } as const;
const shine = { stroke: "#fff", strokeWidth: 3.6, strokeLinecap: "round", fill: "none", opacity: 0.85 } as const;

const C = {
  pink: "#f2476f",
  pinkSoft: "#ff9db4",
  blush: "#ffc2d1",
  orange: "#ff6a2b",
  peach: "#ffb58a",
  yellow: "#ffd21f",
  butter: "#ffe680",
  lime: "#c4f04a",
  green: "#43b649",
  greenDark: "#2f8f3a",
  mint: "#1fc48a",
  teal: "#12b5a6",
  sky: "#3aa7f2",
  skySoft: "#bfe3ff",
  ice: "#e6f3ff",
  blue: "#2f5bea",
  indigo: "#4b50e6",
  lilac: "#b79bff",
  plum: "#b94fcb",
  tan: "#c9b299",
  brown: "#8a5a34",
  cream: "#fff6e3",
  white: "#ffffff",
  grey: "#c9ced3",
};

/** Overlapping shapes drawn as one outlined silhouette. */
function U({ fill, children, w = 7.2 }: { fill: string; children: ReactNode; w?: number }) {
  return (
    <>
      <g fill={fill} stroke={K} strokeWidth={w} strokeLinejoin="round" strokeLinecap="round">
        {children}
      </g>
      <g fill={fill} stroke="none">
        {children}
      </g>
    </>
  );
}

/** A thick coloured line with a dark outline (tubes, handles, ribbons). */
function Tube({ d, color, w = 6 }: { d: string; color: string; w?: number }) {
  return (
    <g className="ln-fat" fill="none" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} stroke={K} strokeWidth={w + 7} />
      <path d={d} stroke={color} strokeWidth={w} />
    </g>
  );
}

function Face({ x = 50, y = 50, gap = 9, smile = 5 }: { x?: number; y?: number; gap?: number; smile?: number }) {
  return (
    <g>
      <circle cx={x - gap} cy={y} r={2.7} fill={K} />
      <circle cx={x + gap} cy={y} r={2.7} fill={K} />
      <path className="ln" d={`M${x - smile} ${y + 6} Q${x} ${y + 6 + smile} ${x + smile} ${y + 6}`} {...thin} />
    </g>
  );
}

function Spark({ x, y, s = 8, fill = C.white }: { x: number; y: number; s?: number; fill?: string }) {
  const h = s * 0.28;
  return (
    <path
      d={`M${x} ${y - s} C${x + h} ${y - h} ${x + h} ${y - h} ${x + s} ${y} C${x + h} ${y + h} ${x + h} ${y + h} ${x} ${y + s} C${x - h} ${y + h} ${x - h} ${y + h} ${x - s} ${y} C${x - h} ${y - h} ${x - h} ${y - h} ${x} ${y - s} Z`}
      fill={fill}
      {...sk}
      strokeWidth={2.8}
    />
  );
}

export const STICKER_ART: Record<string, () => ReactNode> = {
  /* ---------------- Body ---------------- */
  heart: () => (
    <>
      <path
        d="M50 85 C22 64 12 46 12 33 C12 21 21 13 32 13 C40 13 46 17 50 24 C54 17 60 13 68 13 C79 13 88 21 88 33 C88 46 78 64 50 85 Z"
        fill={C.pink}
        {...sk}
      />
      <path className="ln" d="M23 33 C23 26 27 22 33 21" {...shine} />
      <Face y={42} gap={10} />
    </>
  ),
  brain: () => (
    <>
      <path
        d="M31 28 C30 17 44 12 50 21 C56 12 70 17 69 28 C81 28 89 40 82 51 C89 62 80 75 68 72 C65 84 53 87 50 77 C47 87 35 84 32 72 C20 75 11 62 18 51 C11 40 19 28 31 28 Z"
        fill={C.blush}
        {...sk}
      />
      <path className="ln" d="M50 21 V77" {...thin} />
      <path className="ln" d="M35 40 Q42 44 36 51 M32 61 Q40 58 42 66 M40 30 Q44 34 42 38" {...thin} />
      <path className="ln" d="M65 40 Q58 44 64 51 M68 61 Q60 58 58 66 M60 30 Q56 34 58 38" {...thin} />
    </>
  ),
  lungs: () => (
    <>
      <path d="M44 36 C31 36 15 54 15 74 C15 84 24 88 32 85 C40 82 44 76 44 67 Z" fill={C.pinkSoft} {...sk} />
      <path d="M56 36 C69 36 85 54 85 74 C85 84 76 88 68 85 C60 82 56 76 56 67 Z" fill={C.pinkSoft} {...sk} />
      <rect x="44.5" y="12" width="11" height="34" rx="5.5" fill={C.blush} {...sk} />
      <path className="ln" d="M25 66 Q31 62 33 54 M75 66 Q69 62 67 54" {...thin} />
    </>
  ),
  gut: () => (
    <>
      <path
        d="M33 12 H46 V25 C46 31 50 34 56 34 C74 34 87 46 87 62 C87 78 73 88 57 88 C43 88 34 83 30 75 H17 V62 H28 C24 54 26 44 33 38 Z"
        fill={C.peach}
        {...sk}
      />
      <path className="ln" d="M44 62 Q52 54 60 62 Q68 70 76 62" {...thin} />
      <path className="ln" d="M52 44 C60 43 68 46 72 51" {...shine} />
    </>
  ),
  bone: () => (
    <g transform="rotate(-40 50 50)">
      <U fill={C.cream}>
        <circle cx="22" cy="40" r="11" />
        <circle cx="22" cy="60" r="11" />
        <circle cx="78" cy="40" r="11" />
        <circle cx="78" cy="60" r="11" />
        <rect x="24" y="42" width="52" height="16" />
      </U>
      <path className="ln" d="M36 47 H56" stroke="#e9d9b8" strokeWidth="3.6" strokeLinecap="round" fill="none" />
    </g>
  ),
  tooth: () => (
    <>
      <path
        d="M28 19 C36 13 44 19 50 19 C56 19 64 13 72 19 C85 28 80 46 76 56 C72 66 73 85 66 85 C59 85 60 65 50 65 C40 65 41 85 34 85 C27 85 28 66 24 56 C20 46 15 28 28 19 Z"
        fill={C.white}
        {...sk}
      />
      <Face y={38} gap={10} />
      <Spark x={80} y={20} s={7} fill={C.yellow} />
    </>
  ),
  eye: () => (
    <>
      <path d="M10 50 Q50 12 90 50 Q50 88 10 50 Z" fill={C.white} {...sk} />
      <circle cx="50" cy="50" r="18" fill={C.sky} {...sk} />
      <circle cx="50" cy="50" r="8.5" fill={K} />
      <circle cx="56" cy="44" r="3.6" fill="#fff" />
    </>
  ),
  muscle: () => (
    <>
      <path
        d="M12 86 V63 C20 46 44 40 54 56 C53 45 54 37 56 31 C51 22 56 12 66 12 C77 12 83 21 78 31 C85 45 89 62 87 78 C86 84 82 86 76 86 Z"
        fill={C.yellow}
        {...sk}
      />
      <path className="ln" d="M28 64 C34 55 46 54 52 62" {...thin} />
      <path className="ln" d="M60 21 H72 M62 27 H72" {...thin} />
    </>
  ),
  dna: () => (
    <>
      <path className="ln" d="M38 21 H62 M36 37 H64 M38 53 H62 M36 69 H64 M38 85 H62" stroke={K} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <Tube d="M34 12 C34 30 66 28 66 45 C66 62 34 60 34 78 C34 82 35 85 37 88" color={C.blue} w={5} />
      <Tube d="M66 12 C66 30 34 28 34 45 C34 62 66 60 66 78 C66 82 65 85 63 88" color={C.pink} w={5} />
    </>
  ),
  drop: () => (
    <>
      <path d="M50 11 C50 11 21 46 21 62 C21 78 34 89 50 89 C66 89 79 78 79 62 C79 46 50 11 50 11 Z" fill={C.sky} {...sk} />
      <path className="ln" d="M34 61 C34 70 40 77 48 78" {...shine} />
    </>
  ),
  germ: () => (
    <>
      <U fill={C.green}>
        <circle cx="50" cy="50" r="25" />
        <circle cx="50" cy="18" r="7" />
        <circle cx="72.6" cy="27.4" r="7" />
        <circle cx="82" cy="50" r="7" />
        <circle cx="72.6" cy="72.6" r="7" />
        <circle cx="50" cy="82" r="7" />
        <circle cx="27.4" cy="72.6" r="7" />
        <circle cx="18" cy="50" r="7" />
        <circle cx="27.4" cy="27.4" r="7" />
      </U>
      <circle cx="41" cy="46" r="5.5" fill="#fff" stroke={K} strokeWidth="2.6" />
      <circle cx="59" cy="46" r="5.5" fill="#fff" stroke={K} strokeWidth="2.6" />
      <circle cx="42" cy="47" r="2.2" fill={K} />
      <circle cx="60" cy="47" r="2.2" fill={K} />
      <path className="ln" d="M42 60 Q46 56 50 60 Q54 64 58 60" {...thin} />
    </>
  ),
  shield: () => (
    <>
      <path d="M50 11 L83 22 V46 C83 67 69 81 50 89 C31 81 17 67 17 46 V22 Z" fill={C.mint} {...sk} />
      <path className="ln" d="M35 50 L46 61 L66 39" stroke="#fff" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  thermometer: () => (
    <g transform="rotate(38 50 50)">
      <U fill={C.white}>
        <rect x="42" y="8" width="16" height="60" rx="8" />
        <circle cx="50" cy="76" r="14" />
      </U>
      <rect x="46.5" y="30" width="7" height="42" rx="3.5" fill={C.pink} />
      <circle cx="50" cy="76" r="8.5" fill={C.pink} />
      <path className="ln" d="M58 22 H63 M58 32 H63 M58 42 H63" {...thin} />
    </g>
  ),
  pill: () => (
    <g transform="rotate(-38 50 50)">
      <rect x="12" y="35" width="76" height="30" rx="15" fill={C.white} {...sk} />
      <path d="M50 35 H27 A15 15 0 0 0 27 65 H50 Z" fill={C.pink} {...sk} />
      <path className="ln" d="M24 44 C26 42 30 41 34 41" {...shine} />
      <path className="ln" d="M60 41 H74" stroke="#e5e0d8" strokeWidth="3.6" strokeLinecap="round" fill="none" />
    </g>
  ),
  syringe: () => (
    <g transform="rotate(45 50 50)">
      <path className="ln" d="M50 78 V94" stroke={K} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <rect x="46" y="70" width="8" height="9" rx="2" fill={C.grey} {...sk} />
      <rect x="47" y="8" width="6" height="22" fill={C.grey} {...sk} />
      <rect x="38" y="5" width="24" height="7" rx="3.5" fill={C.orange} {...sk} />
      <rect x="39" y="30" width="22" height="42" rx="4" fill={C.ice} {...sk} />
      <rect x="41.5" y="46" width="17" height="23.5" rx="2" fill={C.sky} />
      <rect x="33" y="27" width="34" height="7" rx="3.5" fill={C.orange} {...sk} />
      <path className="ln" d="M52 42 H58 M52 50 H58 M52 58 H58" {...thin} strokeWidth="2.2" />
    </g>
  ),
  stethoscope: () => (
    <>
      <Tube d="M28 14 V36 A15 15 0 0 0 58 36 V14" color={C.blue} w={5} />
      <Tube d="M43 51 V62 C43 80 72 80 72 62 V56" color={C.blue} w={5} />
      <circle cx="28" cy="13" r="5" fill={K} />
      <circle cx="58" cy="13" r="5" fill={K} />
      <circle cx="72" cy="48" r="11" fill={C.ice} {...sk} />
      <circle cx="72" cy="48" r="4" fill={C.grey} stroke={K} strokeWidth="2.4" />
    </>
  ),
  bandage: () => (
    <g transform="rotate(-38 50 50)">
      <rect x="10" y="35" width="80" height="30" rx="15" fill={C.peach} {...sk} />
      <rect x="37" y="35" width="26" height="30" fill="#ffe2cf" {...sk} />
      <g fill={K}>
        <circle cx="45" cy="45" r="1.9" />
        <circle cx="55" cy="45" r="1.9" />
        <circle cx="45" cy="55" r="1.9" />
        <circle cx="55" cy="55" r="1.9" />
        <circle cx="21" cy="45" r="1.5" />
        <circle cx="27" cy="55" r="1.5" />
        <circle cx="73" cy="45" r="1.5" />
        <circle cx="79" cy="55" r="1.5" />
      </g>
    </g>
  ),
  medkit: () => (
    <>
      <path className="ln" d="M38 31 V24 a6 6 0 0 1 6 -6 h12 a6 6 0 0 1 6 6 V31" stroke={K} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <rect x="13" y="30" width="74" height="56" rx="11" fill={C.pink} {...sk} />
      <U fill={C.white} w={5}>
        <rect x="44" y="42" width="12" height="32" rx="2" />
        <rect x="34" y="52" width="32" height="12" rx="2" />
      </U>
    </>
  ),

  /* ---------------- Food ---------------- */
  apple: () => (
    <>
      <path
        d="M50 31 C40 21 17 24 17 49 C17 71 33 89 44 89 C47 89 48 87 50 87 C52 87 53 89 56 89 C67 89 83 71 83 49 C83 24 60 21 50 31 Z"
        fill={C.pink}
        {...sk}
      />
      <path className="ln" d="M50 31 C50 23 52 17 56 12" {...thin} strokeWidth="3.6" />
      <path d="M57 24 C60 13 72 12 78 14 C76 23 67 30 57 24 Z" fill={C.green} {...sk} strokeWidth="3" />
      <path className="ln" d="M28 46 C28 39 32 35 37 34" {...shine} />
    </>
  ),
  avocado: () => (
    <>
      <path
        d="M50 9 C38 9 32 23 30 37 C28 50 17 56 17 69 C17 83 32 91 50 91 C68 91 83 83 83 69 C83 56 72 50 70 37 C68 23 62 9 50 9 Z"
        fill={C.greenDark}
        {...sk}
      />
      <path
        d="M50 18 C42 18 39 29 38 39 C36 51 26 58 26 68 C26 78 37 83 50 83 C63 83 74 78 74 68 C74 58 64 51 62 39 C61 29 58 18 50 18 Z"
        fill="#dff27a"
      />
      <circle cx="50" cy="66" r="12" fill={C.brown} {...sk} strokeWidth="3" />
      <path className="ln" d="M44 62 C45 59 48 57 51 57" stroke="#c98f5c" strokeWidth="3" strokeLinecap="round" fill="none" />
      <Face y={39} gap={6.5} smile={3.5} />
    </>
  ),
  broccoli: () => (
    <>
      <path d="M41 54 L39 84 C39 89 61 89 61 84 L59 54 Z" fill="#9bd66a" {...sk} />
      <U fill={C.green}>
        <circle cx="32" cy="42" r="17" />
        <circle cx="50" cy="30" r="19" />
        <circle cx="68" cy="42" r="17" />
        <circle cx="50" cy="48" r="14" />
      </U>
      <path className="ln" d="M26 38 Q30 34 34 38 M44 24 Q48 20 52 24 M62 38 Q66 34 70 38" stroke="#2f8f3a" strokeWidth="2.8" strokeLinecap="round" fill="none" />
    </>
  ),
  carrot: () => (
    <>
      <path d="M66 32 C62 20 68 12 76 11 C79 19 76 28 66 32 Z" fill={C.green} {...sk} strokeWidth="3" />
      <path d="M69 35 C76 25 86 24 91 28 C89 37 80 41 69 35 Z" fill={C.green} {...sk} strokeWidth="3" />
      <path
        d="M61 27 C70 30 77 37 74 46 C66 63 40 83 21 88 C16 89 13 85 15 80 C24 61 43 35 55 27 C57 26 59 26 61 27 Z"
        fill={C.orange}
        {...sk}
      />
      <path className="ln" d="M52 40 L59 46 M41 54 L48 60 M30 68 L36 73" {...thin} />
    </>
  ),
  banana: () => (
    <>
      <path
        d="M24 21 C20 21 18 25 19 30 C24 58 44 80 72 83 C80 84 86 80 85 74 C84 71 81 70 78 70 C56 68 39 52 33 27 C32 23 28 21 24 21 Z"
        fill={C.yellow}
        {...sk}
      />
      <path className="ln" d="M27 31 C33 54 48 70 70 76" stroke="#e0ad00" strokeWidth="2.8" strokeLinecap="round" fill="none" />
      <path d="M20 22 C21 17 28 17 29 22" fill={C.brown} {...sk} strokeWidth="3" />
    </>
  ),
  egg: () => (
    <>
      <path
        d="M30 21 C44 9 62 13 72 23 C87 30 91 48 83 62 C79 77 62 89 46 85 C30 87 13 75 14 58 C8 44 17 28 30 21 Z"
        fill={C.white}
        {...sk}
      />
      <circle cx="51" cy="51" r="17" fill="#ffc21f" {...sk} />
      <path className="ln" d="M41 47 C42 42 46 39 51 39" {...shine} />
    </>
  ),
  fish: () => (
    <>
      <path d="M13 50 C24 29 50 25 68 40 L87 27 L82 50 L87 73 L68 60 C50 75 24 71 13 50 Z" fill={C.sky} {...sk} />
      <circle cx="30" cy="46" r="5.2" fill="#fff" stroke={K} strokeWidth="2.6" />
      <circle cx="31" cy="46.5" r="2.2" fill={K} />
      <path className="ln" d="M43 39 Q48 50 43 61" {...thin} />
      <path className="ln" d="M53 46 H62 M53 54 H60" {...thin} />
    </>
  ),
  bread: () => (
    <>
      <path
        d="M22 41 C11 37 13 17 34 17 H66 C87 17 89 37 78 41 V79 C78 83 76 85 72 85 H28 C24 85 22 83 22 79 Z"
        fill="#e9b369"
        {...sk}
      />
      <path d="M29 43 C22 38 24 25 36 25 H64 C76 25 78 38 71 43 V75 C71 77 70 78 68 78 H32 C30 78 29 77 29 75 Z" fill="#ffe7bd" />
      <g fill="#e9b369">
        <circle cx="42" cy="46" r="2.4" />
        <circle cx="57" cy="54" r="2.4" />
        <circle cx="45" cy="64" r="2.4" />
        <circle cx="59" cy="38" r="2" />
      </g>
    </>
  ),
  bowl: () => (
    <>
      <circle cx="30" cy="42" r="12" fill={C.green} {...sk} />
      <circle cx="47" cy="35" r="14" fill={C.lime} {...sk} />
      <circle cx="65" cy="40" r="12" fill={C.green} {...sk} />
      <circle cx="75" cy="45" r="8" fill={C.pink} {...sk} />
      <circle cx="38" cy="46" r="7" fill={C.orange} {...sk} />
      <path d="M11 49 H89 C89 71 72 88 50 88 C28 88 11 71 11 49 Z" fill={C.blue} {...sk} />
      <path className="ln" d="M22 60 C26 70 33 77 42 80" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" fill="none" opacity="0.6" />
    </>
  ),
  milk: () => (
    <>
      <rect x="38" y="11" width="24" height="10" rx="2" fill={C.white} {...sk} />
      <path d="M27 40 L38 21 H62 L73 40 Z" fill={C.skySoft} {...sk} />
      <rect x="27" y="40" width="46" height="49" rx="4" fill={C.white} {...sk} />
      <rect x="28.8" y="54" width="42.4" height="19" fill={C.sky} />
      <path d="M50 57 C50 57 44 63 44 66.5 C44 69.5 46.7 71.5 50 71.5 C53.3 71.5 56 69.5 56 66.5 C56 63 50 57 50 57 Z" fill="#fff" />
    </>
  ),
  bottle: () => (
    <>
      <rect x="40" y="22" width="20" height="12" fill={C.white} {...sk} />
      <rect x="37" y="10" width="26" height="13" rx="4" fill={C.blue} {...sk} />
      <rect x="30" y="32" width="40" height="58" rx="11" fill={C.ice} {...sk} />
      <path d="M32 54 H68 V79 A9 9 0 0 1 59 88 H41 A9 9 0 0 1 32 79 Z" fill={C.sky} />
      <path className="ln" d="M32 54 Q41 49 50 54 Q59 59 68 54" stroke={K} strokeWidth="2.6" fill="none" />
      <path className="ln" d="M38 42 V48 M38 62 V78" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" fill="none" opacity="0.85" />
    </>
  ),
  wine: () => (
    <>
      <ellipse cx="50" cy="85" rx="19" ry="5" fill={C.ice} {...sk} />
      <rect x="46.5" y="58" width="7" height="27" fill={C.ice} {...sk} />
      <path d="M29 13 H71 C73 36 68 62 50 62 C32 62 27 36 29 13 Z" fill={C.ice} {...sk} />
      <path d="M30 34 H70 C68.5 50 62 59.5 50 59.5 C38 59.5 31.5 50 30 34 Z" fill="#b0264f" />
      <path className="ln" d="M30 34 H70" stroke={K} strokeWidth="2.6" fill="none" />
      <path className="ln" d="M37 19 V27" {...shine} />
    </>
  ),
  coffee: () => (
    <>
      <path className="ln" d="M36 29 C31 23 41 20 36 12 M52 29 C47 23 57 20 52 12" {...thin} strokeWidth="3.2" />
      <path className="ln" d="M68 47 H75 C86 47 86 66 75 66 H68" stroke={K} strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M18 40 H70 V66 C70 79 59 88 44 88 C29 88 18 79 18 66 Z" fill={C.white} {...sk} />
      <ellipse cx="44" cy="40" rx="26" ry="5.5" fill={C.brown} {...sk} />
      <path d="M36 58 C36 54 41 53 44 57 C47 53 52 54 52 58 C52 63 44 68 44 68 C44 68 36 63 36 58 Z" fill={C.pink} />
    </>
  ),
  donut: () => (
    <>
      <circle cx="50" cy="50" r="38" fill="#f0b77a" {...sk} />
      <path
        d="M50 17 C62 16 76 24 81 36 C86 44 80 50 84 58 C82 70 72 80 60 82 C52 86 46 80 38 82 C26 78 18 68 17 56 C13 48 20 42 19 34 C24 24 36 16 50 17 Z"
        fill={C.pink}
      />
      <circle cx="50" cy="50" r="12" fill={C.white} {...sk} />
      <g strokeWidth="3.6" strokeLinecap="round" fill="none">
        <path d="M33 31 L38 35" stroke={C.yellow} />
        <path d="M62 28 L66 33" stroke="#fff" />
        <path d="M72 50 L77 48" stroke={C.lime} />
        <path d="M66 68 L70 72" stroke={C.yellow} />
        <path d="M36 70 L40 66" stroke="#fff" />
        <path d="M25 50 L30 52" stroke={C.sky} />
        <path d="M48 26 L52 24" stroke={C.sky} />
        <path d="M50 76 L54 73" stroke={C.lime} />
      </g>
    </>
  ),
  leaf: () => (
    <>
      <path d="M16 84 C16 40 40 15 86 15 C86 61 61 84 16 84 Z" fill={C.green} {...sk} />
      <path className="ln" d="M20 80 L68 32 M36 64 V46 M36 64 H54 M50 50 V36 M50 50 H64" {...thin} />
    </>
  ),

  /* ---------------- Fitness ---------------- */
  dumbbell: () => (
    <g transform="rotate(-32 50 50)">
      <rect x="28" y="45" width="44" height="10" fill={C.grey} {...sk} />
      <rect x="9" y="38" width="9" height="24" rx="3.5" fill={C.orange} {...sk} />
      <rect x="17" y="29" width="13" height="42" rx="4.5" fill={C.orange} {...sk} />
      <rect x="82" y="38" width="9" height="24" rx="3.5" fill={C.orange} {...sk} />
      <rect x="70" y="29" width="13" height="42" rx="4.5" fill={C.orange} {...sk} />
      <path className="ln" d="M21 36 V46" {...shine} />
      <path className="ln" d="M74 36 V46" {...shine} />
    </g>
  ),
  kettlebell: () => (
    <>
      <Tube d="M34 46 C28 30 36 16 50 16 C64 16 72 30 66 46" color={C.indigo} w={6} />
      <path d="M50 36 C67 36 80 48 80 63 C80 76 72 88 62 88 H38 C28 88 20 76 20 63 C20 48 33 36 50 36 Z" fill={C.indigo} {...sk} />
      <rect x="37" y="56" width="26" height="15" rx="4" fill={C.lime} {...sk} strokeWidth="3" />
      <path className="ln" d="M29 58 C30 51 34 47 39 45" {...shine} />
    </>
  ),
  sneaker: () => (
    <>
      <path d="M13 69 V49 C13 44 18 42 22 45 L30 51 C33 43 39 38 45 36 L63 55 C72 58 86 59 88 69 Z" fill={C.orange} {...sk} />
      <path d="M10 69 H90 C92 69 92 81 88 81 H15 C10 81 8 74 10 69 Z" fill={C.white} {...sk} />
      <path className="ln" d="M41 44 L48 39 M47 50 L54 45 M53 56 L60 51" stroke="#fff" strokeWidth="3.6" strokeLinecap="round" fill="none" />
      <path className="ln" d="M19 56 H27 M19 62 H31" {...thin} />
    </>
  ),
  lotus: () => (
    <>
      <path d="M9 57 C28 54 44 62 50 74 C34 82 15 77 9 57 Z" fill={C.blush} {...sk} />
      <path d="M91 57 C72 54 56 62 50 74 C66 82 85 77 91 57 Z" fill={C.blush} {...sk} />
      <path d="M22 33 C40 37 50 55 50 74 C33 72 21 56 22 33 Z" fill={C.pinkSoft} {...sk} />
      <path d="M78 33 C60 37 50 55 50 74 C67 72 79 56 78 33 Z" fill={C.pinkSoft} {...sk} />
      <path d="M50 16 C63 33 63 57 50 74 C37 57 37 33 50 16 Z" fill={C.pink} {...sk} />
      <path className="ln" d="M24 84 H76" {...thin} strokeWidth="3.6" />
    </>
  ),
  stopwatch: () => (
    <>
      <rect x="43" y="9" width="14" height="12" rx="3" fill={C.orange} {...sk} />
      <rect x="71" y="22" width="11" height="8" rx="3" transform="rotate(42 76 26)" fill={C.orange} {...sk} />
      <circle cx="50" cy="56" r="33" fill={C.yellow} {...sk} />
      <circle cx="50" cy="56" r="24" fill={C.white} {...sk} strokeWidth="3" />
      <path className="ln" d="M50 37 V41 M50 71 V75 M31 56 H35 M65 56 H69" {...thin} />
      <path className="ln" d="M50 56 L61 44" stroke={C.pink} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="56" r="3.4" fill={K} />
    </>
  ),
  medal: () => (
    <>
      <path d="M30 10 H46 L58 42 L44 46 Z" fill={C.blue} {...sk} />
      <path d="M70 10 H54 L42 42 L56 46 Z" fill={C.pink} {...sk} />
      <circle cx="50" cy="63" r="26" fill={C.yellow} {...sk} />
      <circle cx="50" cy="63" r="17.5" fill={C.butter} stroke={K} strokeWidth="2.6" />
      <path d="M50 51 L53.6 58.4 L61.6 59.4 L55.7 65 L57.2 73 L50 69.1 L42.8 73 L44.3 65 L38.4 59.4 L46.4 58.4 Z" fill={C.orange} stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
    </>
  ),

  /* ---------------- Sleep, mind, lifestyle ---------------- */
  moon: () => (
    <>
      <path
        d="M60 11 C38 13 21 31 21 52 C21 73 38 90 59 90 C71 90 81 85 88 76 C66 79 46 64 46 43 C46 30 52 18 60 11 Z"
        fill={C.yellow}
        {...sk}
      />
      <path className="ln" d="M29 54 Q33 58 37 54" {...thin} />
      <path className="ln" d="M34 66 Q38 69 42 66" {...thin} />
      <Spark x={72} y={30} s={9} />
      <Spark x={84} y={50} s={5} />
    </>
  ),
  sun: () => (
    <>
      <path
        d="M50 8 L57.6 26.5 L74 15.4 L71.5 35 L91 33.2 L79 48.7 L96 59 L77.2 64.6 L84.5 82.8 L66.4 76.6 L61.4 96 L50 81.2 L38.6 96 L33.6 76.6 L15.5 82.8 L22.8 64.6 L4 59 L21 48.7 L9 33.2 L28.5 35 L26 15.4 L42.4 26.5 Z"
        transform="translate(6 5.5) scale(0.88)"
        fill={C.orange}
        {...sk}
      />
      <circle cx="50" cy="51" r="23" fill={C.yellow} {...sk} />
      <Face y={47} gap={8} />
    </>
  ),
  cloud: () => (
    <>
      <U fill={C.ice}>
        <circle cx="31" cy="57" r="17" />
        <circle cx="50" cy="42" r="22" />
        <circle cx="70" cy="56" r="17" />
        <rect x="31" y="56" width="39" height="18" />
      </U>
      <Face y={54} gap={8} />
    </>
  ),
  clock: () => (
    <>
      <circle cx="26" cy="25" r="11" fill={C.yellow} {...sk} />
      <circle cx="74" cy="25" r="11" fill={C.yellow} {...sk} />
      <path className="ln" d="M28 82 L21 90 M72 82 L79 90" stroke={K} strokeWidth="5" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="55" r="33" fill={C.pink} {...sk} />
      <circle cx="50" cy="55" r="24" fill={C.white} {...sk} strokeWidth="3" />
      <path className="ln" d="M50 55 V40 M50 55 L61 62" stroke={K} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="55" r="3" fill={K} />
    </>
  ),
  bed: () => (
    <>
      <rect x="15" y="74" width="8" height="14" rx="2" fill={C.tan} {...sk} />
      <rect x="77" y="74" width="8" height="14" rx="2" fill={C.tan} {...sk} />
      <rect x="10" y="27" width="12" height="52" rx="5" fill={C.tan} {...sk} />
      <rect x="20" y="55" width="70" height="23" rx="6" fill={C.ice} {...sk} />
      <rect x="25" y="43" width="24" height="15" rx="7.5" fill={C.white} {...sk} />
      <path d="M46 49 H82 A8 8 0 0 1 90 57 V78 H46 Z" fill={C.indigo} {...sk} />
      <path className="ln" d="M60 22 H70 L60 33 H70" {...thin} strokeWidth="3.2" />
      <path className="ln" d="M76 12 H82 L76 19 H82" {...thin} strokeWidth="2.6" />
    </>
  ),
  smile: () => (
    <>
      <circle cx="50" cy="50" r="38" fill={C.yellow} {...sk} />
      <ellipse cx="38" cy="42" rx="3.6" ry="6" fill={K} />
      <ellipse cx="62" cy="42" rx="3.6" ry="6" fill={K} />
      <path className="ln" d="M31 57 Q50 78 69 57" stroke={K} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="27" cy="56" r="5" fill={C.pinkSoft} opacity="0.9" />
      <circle cx="73" cy="56" r="5" fill={C.pinkSoft} opacity="0.9" />
    </>
  ),
  phone: () => (
    <g transform="rotate(8 50 50)">
      <rect x="29" y="8" width="42" height="84" rx="10" fill={K} {...sk} />
      <rect x="33.5" y="17" width="33" height="62" rx="4" fill={C.ice} />
      <path d="M41 42 C41 37 47 36 50 40.5 C53 36 59 37 59 42 C59 48 50 54 50 54 C50 54 41 48 41 42 Z" fill={C.pink} stroke={K} strokeWidth="2.4" strokeLinejoin="round" />
      <path className="ln" d="M40 63 H60 M43 69 H57" stroke={C.sky} strokeWidth="3.2" strokeLinecap="round" fill="none" />
      <path className="ln" d="M45 85.5 H55" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" fill="none" />
    </g>
  ),
  flame: () => (
    <>
      <path
        d="M50 9 C54 26 75 36 75 59 C75 77 63 90 50 90 C37 90 25 77 25 59 C25 48 31 42 36 33 C38 44 42 47 45 47 C42 34 44 20 50 9 Z"
        fill={C.orange}
        {...sk}
      />
      <path d="M50 51 C56 59 63 63 63 71 C63 79 57 85 50 85 C43 85 37 79 37 71 C37 63 46 59 50 51 Z" fill={C.yellow} />
    </>
  ),
  bolt: () => <path d="M57 9 L21 55 H44 L37 91 L79 42 H55 Z" fill={C.yellow} {...sk} />,
  scale: () => (
    <>
      <rect x="14" y="18" width="72" height="68" rx="15" fill={C.mint} {...sk} />
      <path d="M30 48 A20 20 0 0 1 70 48 Z" fill={C.white} {...sk} strokeWidth="3" />
      <path className="ln" d="M50 48 L58 35" stroke={C.pink} strokeWidth="4" strokeLinecap="round" fill="none" />
      <circle cx="50" cy="48" r="3" fill={K} />
      <path className="ln" d="M33 62 V72 M67 62 V72" stroke="#0f8f66" strokeWidth="9" strokeLinecap="round" fill="none" opacity="0.5" />
    </>
  ),
  tape: () => (
    <>
      <path d="M44 68 H89 V84 H44 Z" fill={C.white} {...sk} />
      <path className="ln" d="M56 78 V84 M64 74 V84 M72 78 V84 M80 74 V84" {...thin} strokeWidth="2.4" />
      <circle cx="42" cy="50" r="32" fill={C.yellow} {...sk} />
      <circle cx="42" cy="50" r="13" fill={C.white} {...sk} strokeWidth="3" />
      <path className="ln" d="M20 44 C22 34 29 27 38 25" {...shine} />
    </>
  ),
  calendar: () => (
    <>
      <rect x="14" y="20" width="72" height="68" rx="11" fill={C.white} {...sk} />
      <path d="M14 42 V31 a11 11 0 0 1 11 -11 h50 a11 11 0 0 1 11 11 v11 Z" fill={C.pink} {...sk} />
      <rect x="29" y="11" width="8" height="18" rx="4" fill={C.white} {...sk} strokeWidth="3" />
      <rect x="63" y="11" width="8" height="18" rx="4" fill={C.white} {...sk} strokeWidth="3" />
      <g fill="#e5e0d8">
        <rect x="24" y="50" width="11" height="10" rx="2.5" />
        <rect x="44.5" y="50" width="11" height="10" rx="2.5" />
        <rect x="65" y="50" width="11" height="10" rx="2.5" />
        <rect x="24" y="68" width="11" height="10" rx="2.5" />
        <rect x="65" y="68" width="11" height="10" rx="2.5" />
      </g>
      <rect x="43" y="66.5" width="14" height="13" rx="3.5" fill={C.lime} stroke={K} strokeWidth="2.6" />
      <path className="ln" d="M46 73 L49 76 L54 70" {...thin} strokeWidth="2.6" />
    </>
  ),
  sparkle: () => (
    <>
      <path
        d="M46 12 C50 38 60 48 86 52 C60 56 50 66 46 92 C42 66 32 56 6 52 C32 48 42 38 46 12 Z"
        transform="translate(4 -2) scale(0.9)"
        fill={C.yellow}
        {...sk}
      />
      <Spark x={78} y={22} s={11} />
      <Spark x={76} y={78} s={7} fill={C.lime} />
    </>
  ),
  flower: () => (
    <>
      <U fill={C.pinkSoft}>
        <circle cx="50" cy="26" r="15" />
        <circle cx="72.8" cy="42.6" r="15" />
        <circle cx="64.1" cy="69.4" r="15" />
        <circle cx="35.9" cy="69.4" r="15" />
        <circle cx="27.2" cy="42.6" r="15" />
      </U>
      <circle cx="50" cy="50" r="13" fill={C.yellow} {...sk} />
      <Face y={47} gap={5} smile={3} />
    </>
  ),
  hourglass: () => (
    <>
      <path d="M29 18 H71 C71 36 57 44 55 50 C57 56 71 64 71 82 H29 C29 64 43 56 45 50 C43 44 29 36 29 18 Z" fill={C.ice} {...sk} />
      <path d="M36 28 H64 C62 37 55 42 50 47 C45 42 38 37 36 28 Z" fill={C.orange} />
      <path d="M33 82 C35 71 43 66 50 66 C57 66 65 71 67 82 Z" fill={C.orange} />
      <path className="ln" d="M50 48 V64" stroke={C.orange} strokeWidth="2.6" strokeLinecap="round" strokeDasharray="1 5" fill="none" />
      <rect x="22" y="10" width="56" height="10" rx="5" fill={C.tan} {...sk} />
      <rect x="22" y="80" width="56" height="10" rx="5" fill={C.tan} {...sk} />
    </>
  ),
  mustache: () => (
    <path
      d="M50 45 C58 33 77 35 82 46 C85 52 91 51 92 44 C96 59 85 69 72 67 C62 65 54 58 50 52 C46 58 38 65 28 67 C15 69 4 59 8 44 C9 51 15 52 18 46 C23 35 42 33 50 45 Z"
      fill={C.brown}
      {...sk}
    />
  ),
  ribbon: () => (
    <Tube d="M36 89 L62 42 C69 29 62 13 50 13 C38 13 31 29 38 42 L64 89" color={C.pink} w={9} />
  ),

  /* ---------------- Interface ---------------- */
  chat: () => (
    <>
      <path d="M19 19 H81 a9 9 0 0 1 9 9 V59 a9 9 0 0 1 -9 9 H53 L34 86 V68 H19 a9 9 0 0 1 -9 -9 V28 a9 9 0 0 1 9 -9 Z" fill={C.blue} {...sk} />
      <g fill="#fff">
        <circle cx="33" cy="44" r="4.6" />
        <circle cx="50" cy="44" r="4.6" />
        <circle cx="67" cy="44" r="4.6" />
      </g>
    </>
  ),
  mail: () => (
    <>
      <rect x="10" y="24" width="80" height="54" rx="9" fill={C.white} {...sk} />
      <path className="ln" d="M13 29 L50 56 L87 29" {...thin} strokeWidth="3.6" />
      <path d="M41 61 C41 55 48 54 50 59 C52 54 59 55 59 61 C59 67 50 73 50 73 C50 73 41 67 41 61 Z" fill={C.pink} stroke={K} strokeWidth="2.6" strokeLinejoin="round" />
    </>
  ),
  magnifier: () => (
    <>
      <Tube d="M61 61 L84 84" color={C.orange} w={7} />
      <circle cx="42" cy="42" r="28" fill={C.ice} {...sk} strokeWidth="5" />
      <path className="ln" d="M26 40 C27 32 32 27 40 26" {...shine} />
    </>
  ),
  check: () => (
    <>
      <circle cx="50" cy="50" r="38" fill={C.green} {...sk} />
      <path className="ln" d="M31 51 L45 65 L70 37" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  cross: () => (
    <>
      <circle cx="50" cy="50" r="38" fill={C.pink} {...sk} />
      <path className="ln" d="M35 35 L65 65 M65 35 L35 65" stroke="#fff" strokeWidth="9" strokeLinecap="round" fill="none" />
    </>
  ),

  /* ---------------- Brand extras (not referenced by content) ---------------- */
  pulse: () => (
    <>
      <rect x="10" y="24" width="80" height="52" rx="14" fill={C.lime} {...sk} />
      <path className="ln" d="M18 52 H34 L41 36 L52 66 L59 46 L64 52 H82" stroke={K} strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  star: () => (
    <path
      d="M50 10 L61.8 34.6 L88.8 38.2 L69 57 L74 83.8 L50 70.8 L26 83.8 L31 57 L11.2 38.2 L38.2 34.6 Z"
      fill={C.yellow}
      {...sk}
    />
  ),
  plus: () => (
    <U fill={C.pink}>
      <rect x="38" y="14" width="24" height="72" rx="6" />
      <rect x="14" y="38" width="72" height="24" rx="6" />
    </U>
  ),
  peace: () => (
    <>
      <circle cx="50" cy="50" r="38" fill={C.lime} {...sk} />
      <path className="ln" d="M50 14 V86 M50 50 L25 76 M50 50 L75 76" stroke={K} strokeWidth="5" strokeLinecap="round" fill="none" />
    </>
  ),
};

export type StickerName = keyof typeof STICKER_ART;
export const STICKER_NAMES = Object.keys(STICKER_ART);
