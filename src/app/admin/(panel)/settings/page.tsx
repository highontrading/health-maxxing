import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/admin/ui";
import { flattenSettings, loadSettingsFresh } from "@/lib/admin/settings-store";
import { requireAdmin } from "@/lib/auth";
import type { SettingsGroup } from "@/lib/settings";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Settings" };

const GROUPS: SettingsGroup[] = ["site", "announcement", "home", "newsletter", "social", "community"];

export default async function SettingsPage() {
  await requireAdmin();
  const settings = await loadSettingsFresh();
  return (
    <PageTransition variant="panel">
      <PageHeader title="Settings" description="Site-wide text and switches. Changes show on the site as soon as you save." />
      <SettingsForm groups={GROUPS} values={flattenSettings(settings, GROUPS)} />
    </PageTransition>
  );
}
