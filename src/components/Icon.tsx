import type { SVGProps } from "react";

const PATHS: Record<string, string> = {
  "arrow-right": "M5 12h14M13 6l6 6-6 6",
  "arrow-left": "M19 12H5M11 6l-6 6 6 6",
  "arrow-up-right": "M7 17 17 7M8 7h9v9",
  "arrow-down": "M12 5v14M6 13l6 6 6-6",
  "chevron-down": "m6 9 6 6 6-6",
  "chevron-right": "m9 6 6 6-6 6",
  "chevron-left": "m15 6-6 6 6 6",
  search: "M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16ZM21 21l-4.3-4.3",
  menu: "M4 7h16M4 12h16M4 17h16",
  close: "M6 6l12 12M18 6 6 18",
  check: "m5 12.5 4.5 4.5L19 7.5",
  plus: "M12 5v14M5 12h14",
  minus: "M5 12h14",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3.5 2",
  bookmark: "M6 4h12v17l-6-4.5L6 21V4Z",
  share: "M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7M12 15V3M7.5 7.5 12 3l4.5 4.5",
  link: "M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1.2 1.2M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1.2-1.2",
  external: "M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5",
  user: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM4.5 20.5c1-3.6 4-5.5 7.5-5.5s6.5 1.9 7.5 5.5",
  heart: "M12 20.5S3.5 15 3.5 9A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8.5 2c0 6-8.5 11.5-8.5 11.5Z",
  message: "M4 5h16v11H9l-5 4V5Z",
  flag: "M5 21V4M5 4h11l-2 4 2 4H5",
  pin: "M9 4h6l-1 6 3 3H7l3-3-1-6ZM12 13v7",
  lock: "M6 11h12v9H6v-9ZM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  edit: "M4 20h4L19 9l-4-4L4 16v4ZM13.5 6.5l4 4",
  trash: "M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v5M14 11v5",
  eye: "M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12ZM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  "eye-off": "M4 4l16 16M9.9 5.8A9.6 9.6 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a16 16 0 0 1-2.9 3.7M6.3 7.5A15.7 15.7 0 0 0 2.5 12S6 18.5 12 18.5c1.3 0 2.5-.3 3.6-.8M10 10.3a2.5 2.5 0 0 0 3.6 3.5",
  settings: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3.9a7 7 0 0 0-2-1.2L14.2 3h-4l-.4 2.6a7 7 0 0 0-2 1.2l-2.3-.9-2 3.4 2 1.5A7 7 0 0 0 5 12c0 .4 0 .8.1 1.2l-2 1.5 2 3.4 2.3-.9a7 7 0 0 0 2 1.2l.4 2.6h4l.4-2.6a7 7 0 0 0 2-1.2l2.3.9 2-3.4-2-1.5c.1-.4.1-.8.1-1.2Z",
  grid: "M4 4h7v7H4V4ZM13 4h7v7h-7V4ZM4 13h7v7H4v-7ZM13 13h7v7h-7v-7Z",
  list: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  filter: "M4 5h16l-6 7.5V19l-4 1.5v-8L4 5Z",
  sort: "M7 4v16M3.5 16.5 7 20l3.5-3.5M17 20V4M13.5 7.5 17 4l3.5 3.5",
  upload: "M12 16V4M7 9l5-5 5 5M5 20h14",
  download: "M12 4v12M7 11l5 5 5-5M5 20h14",
  copy: "M9 9h11v11H9V9ZM5 15H4V4h11v1",
  refresh: "M20 11A8 8 0 0 0 6 6.3L4 8M4 4v4h4M4 13a8 8 0 0 0 14 4.7l2-1.7M20 20v-4h-4",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 11v6M12 7.5h.01",
  alert: "M12 3.5 2.5 20h19L12 3.5ZM12 10v4.5M12 17.5h.01",
  sparkles: "M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3ZM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16Z",
  home: "M4 11 12 4l8 7v9h-5v-6H9v6H4v-9Z",
  mail: "M3.5 6h17v12h-17V6ZM4 7l8 6 8-6",
  logout: "M10 4H5v16h5M15 8l4 4-4 4M19 12H9",
  bolt: "M13 3 5 13.5h6L10 21l9-11h-6l0-7Z",
  book: "M5 4h9a4 4 0 0 1 4 4v12H9a4 4 0 0 1-4-4V4ZM18 20a3 3 0 0 0-3-3H5",
  users: "M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM2.5 19.5c.8-3 3.300-4.500 6.500-4.500s5.7 1.500 6.500 4.500M16 4.500a3.500 3.500 0 0 1 0 6.500M18 15.300c1.800.600 3 2 3.500 4.200",
  "thumbs-up": "M7 10v10H4V10h3ZM7 10l4-7c1.500 0 2.500 1 2.500 2.500V9h5a2 2 0 0 1 2 2.300l-1.200 7A2 2 0 0 1 17.300 20H7",
  image: "M4 5h16v14H4V5ZM4 16l4.500-4.500 4 4 2.500-2.500L20 18M9 9.500h.01",
  code: "m9 8-4 4 4 4M15 8l4 4-4 4",
  quote: "M6 17a3 3 0 0 0 3-3v-1H5V8h5v6a4 4 0 0 1-4 4M15 17a3 3 0 0 0 3-3v-1h-4V8h5v6a4 4 0 0 1-4 4",
  bold: "M7 5h6a3.500 3.500 0 0 1 0 7H7V5ZM7 12h7a3.500 3.500 0 0 1 0 7H7v-7Z",
  italic: "M10 5h7M7 19h7M14 5l-4 14",
  heading: "M6 5v14M18 5v14M6 12h12",
  table: "M4 5h16v14H4V5ZM4 10h16M4 15h16M10 5v14",
  activity: "M3 12h4l3-8 4 16 3-8h4",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3",
  key: "M14.500 9.500a4 4 0 1 0-3.800 5.200L12 16h2v2h2v2h3v-3l-5.200-5.200c.400-.700.700-1.500.700-2.300ZM8.500 9.500h.01",
  bot: "M12 7V4M8 4h8M5 8h14v11H5V8ZM9 13h.01M15 13h.01M9.500 16h5",
  dot: "M12 12h.01",
};

export type IconName = keyof typeof PATHS;

/** Minimal 24px stroke icons. `name` falls back to a dot if unknown. */
export function Icon({ name, size = 20, strokeWidth = 2, ...rest }: { name: string; size?: number; strokeWidth?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={PATHS[name] ?? PATHS.dot} />
    </svg>
  );
}
