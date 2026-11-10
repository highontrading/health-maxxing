import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryForm } from "@/components/admin/EntryForm";
import { PageHeader } from "@/components/admin/ui";
import { getCollection } from "@/lib/admin/collections";
import { blankEntry, loadOptions } from "@/lib/admin/store";
import { requireStaff } from "@/lib/auth";

type Props = PageProps<"/admin/c/[collection]/new">;

export const metadata: Metadata = { title: "New entry" };

export default async function NewEntryPage({ params }: Props) {
  await requireStaff();
  const def = getCollection((await params).collection);
  if (!def) notFound();
  const options = await loadOptions();
  return (
    <>
      <PageHeader title={`New ${def.singular}`} back={{ href: `/admin/c/${def.key}`, label: def.plural }} description="It starts as a draft. Nothing is public until you set it to Published and save." />
      <EntryForm collectionKey={def.key} id={null} initial={blankEntry(def)} options={options} />
    </>
  );
}
