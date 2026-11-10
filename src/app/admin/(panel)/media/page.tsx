import type { Metadata } from "next";
import { deleteMediaAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { CopyButton, MediaUploader } from "@/components/admin/MediaClient";
import { Card, day, EmptyState, Notice, PageHeader } from "@/components/admin/ui";
import { listMedia } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "Media" };

const size = (bytes: number) => (bytes >= 1_048_576 ? `${(bytes / 1_048_576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

export default async function MediaPage({ searchParams }: PageProps<"/admin/media">) {
  await requireStaff();
  const [query, items] = await Promise.all([searchParams, listMedia()]);
  return (
    <PageTransition variant="panel">
      <PageHeader
        title="Media"
        description="Photos you can use as article covers or inside articles. Only upload images you have the right to publish, and say where a photo came from in the article’s photo credit."
      />
      <Notice query={query} />
      <Card title="Upload an image" className="mb-5">
        <MediaUploader />
        <p className="field-help mt-3">PNG, JPEG, WebP, GIF or AVIF, up to 4 MB. Around 1600 pixels wide is plenty for a cover.</p>
      </Card>
      {items.length ? (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((m) => (
            <li key={m.id} className="admin-card overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`/media/${m.id}`} alt={m.alt} loading="lazy" className="aspect-[4/3] w-full bg-sand object-cover" />
              <div className="p-3">
                <p className="truncate text-sm font-semibold" title={m.filename}>
                  {m.filename}
                </p>
                <p className="text-xs text-ink-3">
                  {size(m.size)} · {day(m.createdAt)} · /media/{m.id}
                </p>
                <div className="mt-2 flex items-center justify-between gap-1">
                  <CopyButton text={`/media/${m.id}`} />
                  <form action={deleteMediaAction}>
                    <input type="hidden" name="id" value={m.id} />
                    <ConfirmSubmit confirm="Delete">Delete</ConfirmSubmit>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <div className="admin-card">
          <EmptyState sticker="sparkle" title="No images yet.">
            Articles use sticker-art covers until you give them a photo, so this is optional.
          </EmptyState>
        </div>
      )}
    </PageTransition>
  );
}
