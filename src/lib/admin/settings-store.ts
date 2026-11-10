/** Fresh (uncached) reads of the site settings for the admin forms. */
import { json, query } from "@/lib/db";
import { mergeSettings, type SettingsGroup, type SiteSettings } from "@/lib/settings";

export type FlatSettings = Record<string, string | number | boolean | string[]>;

export async function loadSettingsFresh(): Promise<SiteSettings> {
  const rows = await query<{ key: string; value: string }>("SELECT key, value FROM settings");
  return mergeSettings(Object.fromEntries(rows.map((r) => [r.key, json<unknown>(r.value, null)])));
}

/** { site: { name } } -> { "site.name": … } for the listed groups. */
export function flattenSettings(settings: SiteSettings, groups: SettingsGroup[]): FlatSettings {
  const out: FlatSettings = {};
  for (const g of groups) for (const [k, v] of Object.entries(settings[g])) out[`${g}.${k}`] = v as FlatSettings[string];
  return out;
}
