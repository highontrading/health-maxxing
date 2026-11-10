/** How each site setting is presented in the admin panel. Plain data. */
import { AUTOPILOT_MODELS, type SettingsGroup } from "@/lib/settings";

export type SettingField = {
  key: string;
  label: string;
  help?: string;
  kind: "text" | "textarea" | "lines" | "boolean" | "number" | "select";
  rows?: number;
  placeholder?: string;
  options?: { value: string; label: string }[];
};

export type SettingSection = { group: SettingsGroup; title: string; blurb: string; fields: SettingField[] };

const link = (key: string, label: string): SettingField => ({ key, label, kind: "text", placeholder: "https://" });

export const SETTING_SECTIONS: SettingSection[] = [
  {
    group: "site",
    title: "Site",
    blurb: "The basics, used in the header, the footer and by search engines.",
    fields: [
      { key: "name", label: "Site name", kind: "text" },
      { key: "tagline", label: "Tagline", kind: "text" },
      { key: "description", label: "Description", kind: "textarea", rows: 3, help: "One or two sentences. Shown to search engines and when a link is shared." },
      { key: "contactEmail", label: "Contact email", kind: "text", placeholder: "hello@example.com", help: "Optional. Shown on the contact page." },
    ],
  },
  {
    group: "announcement",
    title: "Announcement bar",
    blurb: "A thin strip across the top of every page.",
    fields: [
      { key: "enabled", label: "Show the announcement bar", kind: "boolean" },
      { key: "text", label: "Message", kind: "text", placeholder: "New: our guide to sleep is out" },
      { key: "href", label: "Link", kind: "text", placeholder: "/articles/…", help: "Optional. A page on this site, or a full https:// link." },
    ],
  },
  {
    group: "home",
    title: "Home page",
    blurb: "The words at the top of the home page.",
    fields: [
      { key: "eyebrow", label: "Small line above the headline", kind: "text" },
      { key: "title", label: "Headline, first line", kind: "text" },
      { key: "accent", label: "Headline, second line", kind: "text", help: "Set in the italic serif." },
      { key: "lede", label: "Introduction", kind: "textarea", rows: 3 },
      { key: "coverStory", label: "Cover story", kind: "text", placeholder: "how-much-protein-do-you-need", help: "The URL name of the article on the magazine cover. Leave empty to use the newest featured article." },
      {
        key: "manifesto",
        label: "Manifesto",
        kind: "textarea",
        rows: 5,
        help: "Put a sticker inside the sentence by writing its name in curly brackets, like {heart} or {moon}.",
      },
      { key: "ticker", label: "Scrolling ticker", kind: "lines", rows: 8, help: "One short phrase per line." },
    ],
  },
  {
    group: "newsletter",
    title: "Newsletter",
    blurb: "How the newsletter is named and described on sign-up forms.",
    fields: [
      { key: "name", label: "Newsletter name", kind: "text" },
      { key: "blurb", label: "Pitch", kind: "textarea", rows: 3 },
      { key: "cadence", label: "How often", kind: "text", placeholder: "Weekly" },
      { key: "fromName", label: "Sender name", kind: "text" },
    ],
  },
  {
    group: "social",
    title: "Social links",
    blurb: "Shown in the footer. Leave a field empty to hide that link.",
    fields: [link("instagram", "Instagram"), link("x", "X"), link("youtube", "YouTube"), link("tiktok", "TikTok"), link("threads", "Threads"), link("linkedin", "LinkedIn")],
  },
  {
    group: "community",
    title: "Community",
    blurb: "Switches for the forum and for new accounts.",
    fields: [
      { key: "enabled", label: "Members can post in the community", kind: "boolean", help: "Turn off to make the forum read-only for everyone except staff." },
      { key: "signupsOpen", label: "New people can create accounts", kind: "boolean" },
    ],
  },
  {
    group: "autopilot",
    title: "Autopilot",
    blurb: "How Claude drafts articles from the topic queue.",
    fields: [
      {
        key: "model",
        label: "Claude model",
        kind: "select",
        options: AUTOPILOT_MODELS.map((m) => ({ value: m.id, label: m.label })),
        help: "Used for research and drafting. Stronger models write better and cost more per article.",
      },
      {
        key: "research",
        label: "Research each topic with web search first",
        kind: "boolean",
        help: "Recommended. Claude looks up current guidance and cites the pages it found, instead of writing from memory. Adds one API call and search fees per article.",
      },
      {
        key: "autoTopics",
        label: "Let Claude choose topics when the queue is empty",
        kind: "boolean",
        help: "With this on, a scheduled run never idles: it proposes topics the site does not cover yet, then drafts them.",
      },
      { key: "perRun", label: "Articles per run", kind: "number", help: "How many queued topics one run drafts (1 to 5)." },
      {
        key: "autoPublish",
        label: "Publish drafts without review",
        kind: "boolean",
        help: "Off is strongly recommended for health content: drafts then wait for you, marked as pending a fact check.",
      },
      { key: "guidance", label: "Extra guidance for the writer", kind: "textarea", rows: 4, help: "Optional. For example an audience to keep in mind, or topics to avoid." },
    ],
  },
];
