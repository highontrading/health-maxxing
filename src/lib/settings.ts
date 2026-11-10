/**
 * Site settings live in the `settings` table as JSON, one row per group.
 * These defaults fill any gaps, so the site renders before anything is saved.
 */
export type SiteSettings = {
  site: { name: string; tagline: string; description: string; contactEmail: string };
  announcement: { enabled: boolean; text: string; href: string };
  social: { instagram: string; x: string; youtube: string; tiktok: string; threads: string; linkedin: string };
  newsletter: { name: string; blurb: string; cadence: string; fromName: string };
  home: {
    eyebrow: string;
    title: string;
    accent: string;
    lede: string;
    coverStory: string;
    manifesto: string;
    ticker: string[];
  };
  community: { enabled: boolean; signupsOpen: boolean };
  autopilot: { model: string; autoPublish: boolean; perRun: number; guidance: string };
};

export const DEFAULT_SETTINGS: SiteSettings = {
  site: {
    name: "Health Maxxing",
    tagline: "Feel better, on purpose",
    description:
      "Evidence-based guides to nutrition, fitness, sleep, mental health and every part of your body. Clear, sourced and free of hype.",
    contactEmail: "",
  },
  announcement: { enabled: false, text: "", href: "" },
  social: { instagram: "", x: "", youtube: "", tiktok: "", threads: "", linkedin: "" },
  newsletter: {
    name: "The Weekly Dose",
    blurb: "One email a week. The most useful thing we learned about your body, plus what to do with it.",
    cadence: "Weekly",
    fromName: "Health Maxxing",
  },
  home: {
    eyebrow: "The health magazine that reads the studies",
    title: "Feel better,",
    accent: "on purpose.",
    lede: "Straight answers on food, fitness, sleep, mind and every part of your body. Sourced, practical and free of detox teas.",
    coverStory: "",
    manifesto:
      "Your health is not a hack {bolt} or a 30-day challenge. It is {heart} the boring, brilliant stuff {avocado} done most days: eat real food, move {dumbbell} often, sleep {moon} like it matters, see people {chat} you love, and check the numbers {stethoscope} before they check you.",
    ticker: [
      "Eat the fiber",
      "Lift something",
      "Go to bed",
      "Drink some water",
      "Call a friend",
      "Wear the sunscreen",
      "Take the stairs",
      "Book the checkup",
      "Touch grass",
      "Read the label",
    ],
  },
  community: { enabled: true, signupsOpen: true },
  autopilot: {
    model: "claude-opus-5-5",
    autoPublish: false,
    perRun: 1,
    guidance: "",
  },
};

export type SettingsGroup = keyof SiteSettings;
export const SETTINGS_GROUPS = Object.keys(DEFAULT_SETTINGS) as SettingsGroup[];

/** Merge stored JSON over the defaults, one level deep. Unknown keys are dropped. */
export function mergeSettings(stored: Record<string, unknown>): SiteSettings {
  const out = structuredClone(DEFAULT_SETTINGS) as Record<string, Record<string, unknown>>;
  for (const group of SETTINGS_GROUPS) {
    const value = stored[group];
    if (value && typeof value === "object" && !Array.isArray(value)) {
      for (const key of Object.keys(out[group])) {
        const incoming = (value as Record<string, unknown>)[key];
        if (incoming !== undefined && incoming !== null && typeof incoming === typeof out[group][key]) {
          out[group][key] = incoming;
        }
      }
    }
  }
  return out as unknown as SiteSettings;
}
