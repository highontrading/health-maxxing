import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { EntryForm } from "@/components/admin/EntryForm";
import { Notice, PageHeader, stamp } from "@/components/admin/ui";
import { getCollection } from "@/lib/admin/collections";
import { SendIssuePanel } from "@/components/admin/SendIssuePanel";
import { getRow, loadOptions, toEntry } from "@/lib/admin/store";
import { requireStaff } from "@/lib/auth";
import { sendStatus } from "@/lib/newsletter-send";

type Props = PageProps<"/admin/c/[collection]/[id]">;

export const metadata: Metadata = { title: "Edit" };

const ORIGIN: Record<string, string> = {
  seed: "Content files",
  admin: "Written here",
  autopilot: "Autopilot draft",
  api: "API",
};

export default async function EditEntryPage({ params, searchParams }: Props) {
  const user = await requireStaff();
  const [{ collection, id }, query] = await Promise.all([params, searchParams]);
  const def = getCollection(collection);
  if (!def) notFound();
  const [row, options] = await Promise.all([getRow(def, Number(id)), loadOptions()]);
  if (!row) notFound();
  const entry = toEntry(def, row);

  const facts = [
    { label: "Started as", value: ORIGIN[String(row.origin)] ?? String(row.origin) },
    { label: "Last saved", value: `${stamp(String(row.updated_at))} UTC` },
  ];
  if (row.origin === "seed") facts.push({ label: "Edited here", value: row.edited === 1 ? "Yes" : "No" });
  if (def.hasViews) facts.push({ label: "Views", value: Number(row.views ?? 0).toLocaleString("en-US") });
  if (def.key === "articles") facts.push({ label: "Length", value: `${Number(row.word_count ?? 0).toLocaleString("en-US")} words · ${row.reading_minutes} min` });

  const live = row.status === "published" && def.publicPath ? def.publicPath.replace("{slug}", String(row.slug)) : null;
  // Only admins can email the list.
  const mailing = def.key === "newsletter" && user.role === "admin" ? await sendStatus(Number(row.id)) : null;

  return (
    <>
      <PageHeader title={String(row[def.title] || `Untitled ${def.singular}`)} back={{ href: `/admin/c/${def.key}`, label: def.plural }} />
      <Notice query={query} />
      {mailing && <SendIssuePanel issueId={Number(row.id)} status={mailing} defaultTo={user.email} />}
      <EntryForm collectionKey={def.key} id={Number(row.id)} initial={entry} options={options} publicUrl={live} facts={facts} />
    </>
  );
}
