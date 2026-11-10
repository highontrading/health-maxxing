/**
 * Share images (Open Graph / Twitter cards), drawn with next/og.
 * Only flexbox and inline styles work here, and the default font is used:
 * the site's fonts are WOFF2, which the image renderer cannot read.
 */
import { ImageResponse } from "next/og";

export const OG_SIZE = { width: 1200, height: 630 };

/** soft, solid, ink for each palette colour (mirrors globals.css). */
const TONES: Record<string, [string, string, string]> = {
  lime: ["#e6fab8", "#c4f04a", "#263509"],
  orange: ["#ffe1cc", "#ff6a2b", "#5c1f00"],
  indigo: ["#dfe2ff", "#4b50e6", "#1b1d6b"],
  lilac: ["#ebe1ff", "#9b6bff", "#36197a"],
  pink: ["#ffdce4", "#f2476f", "#6e0f2a"],
  yellow: ["#fff2b3", "#ffd21f", "#4d3b00"],
  teal: ["#cff3ee", "#12b5a6", "#06443f"],
  rose: ["#ffddee", "#e85ca4", "#6b1543"],
  sky: ["#d8eeff", "#3aa7f2", "#0b3f66"],
  peach: ["#ffe4d6", "#ff9466", "#6b2a10"],
  tan: ["#eadfd2", "#b9a794", "#40342a"],
  green: ["#daf4d2", "#43b649", "#15450f"],
  mint: ["#d2f6e4", "#1fc48a", "#094530"],
  plum: ["#f3dcf7", "#b94fcb", "#4e155a"],
  sand: ["#f3ecdd", "#d9c49e", "#4a3c22"],
  blue: ["#dce8fc", "#2f5bea", "#10286e"],
};

const INK = "#262422";

export function ogImage(input: { title: string; label?: string; color?: string }): ImageResponse {
  const [soft, solid, ink] = TONES[input.color ?? "lime"] ?? TONES.lime;
  const title = input.title.length > 110 ? `${input.title.slice(0, 107)}…` : input.title;
  const size = title.length > 70 ? 58 : title.length > 40 ? 68 : 82;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#f6f3ee", padding: 36 }}>
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            background: soft,
            borderRadius: 44,
            padding: "52px 60px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Sticker-sheet circles in the corner */}
          <div style={{ position: "absolute", right: -110, bottom: -150, width: 460, height: 460, borderRadius: 460, background: solid, opacity: 0.55, display: "flex" }} />
          <div style={{ position: "absolute", right: 210, bottom: -70, width: 170, height: 170, borderRadius: 170, background: "#ffffff", opacity: 0.7, display: "flex" }} />

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center" }}>
              <svg width="54" height="54" viewBox="0 0 64 64">
                <path
                  d="M32 53S9 39.5 9 24.5C9 16.5 15.2 11 22 11c4.2 0 8 2.2 10 5.6C34 13.2 37.8 11 42 11c6.8 0 13 5.5 13 13.5C55 39.5 32 53 32 53Z"
                  fill="#f2476f"
                  stroke={INK}
                  strokeWidth="3.5"
                  strokeLinejoin="round"
                />
              </svg>
              <div style={{ display: "flex", marginLeft: 14, fontSize: 34, fontWeight: 600, color: INK, letterSpacing: -1 }}>Health Maxxing</div>
            </div>
            {input.label ? (
              <div style={{ display: "flex", background: INK, color: "#ffffff", borderRadius: 999, padding: "10px 24px", fontSize: 26, fontWeight: 600 }}>{input.label}</div>
            ) : null}
          </div>

          <div style={{ display: "flex", maxWidth: 940, fontSize: size, lineHeight: 1.06, fontWeight: 500, letterSpacing: -2.5, color: INK }}>{title}</div>

          <div style={{ display: "flex", fontSize: 26, color: ink }}>Evidence-based health, without the hype</div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
