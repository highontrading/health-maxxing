import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { SITE_NAME, SITE_TAGLINE, siteUrl } from "@/lib/site";

const figtree = localFont({
  src: [
    { path: "../fonts/figtree-latin-wght-normal.woff2", weight: "300 900", style: "normal" },
    { path: "../fonts/figtree-latin-wght-italic.woff2", weight: "300 900", style: "italic" },
  ],
  variable: "--font-figtree",
  display: "swap",
});

const instrument = localFont({
  src: [
    { path: "../fonts/instrument-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../fonts/instrument-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-instrument",
  display: "swap",
});

const pixelify = localFont({
  src: "../fonts/pixelify-sans-latin-wght-normal.woff2",
  weight: "400 700",
  variable: "--font-pixelify",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: `${SITE_NAME} — ${SITE_TAGLINE}`, template: `%s · ${SITE_NAME}` },
  description:
    "Evidence-based guides to nutrition, fitness, sleep, mental health and every part of your body. Clear, sourced and free of hype.",
  applicationName: SITE_NAME,
  openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US" },
  twitter: { card: "summary_large_image" },
  alternates: { types: { "application/rss+xml": "/rss.xml" } },
};

export const viewport: Viewport = {
  themeColor: "#f6f3ee",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // data-scroll-behavior: page changes jump to the top at once, while links within a page still scroll smoothly.
    // viewTransitionName "root": keeps the page background and footer in every page transition, so they cross-fade
    // instead of jumping (React leaves the root out unless it is named here).
    <html
      lang="en"
      data-scroll-behavior="smooth"
      style={{ viewTransitionName: "root" }}
      className={`${figtree.variable} ${instrument.variable} ${pixelify.variable}`}
    >
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
