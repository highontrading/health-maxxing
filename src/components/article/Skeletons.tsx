import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Placeholders for the reading pages, shown while a page's content loads (the
 * fallback inside <PageTransition variant="skeleton">). Each is an outline of
 * the page it stands for, on the same grid, so the content arrives into the
 * shape that was waiting for it. The header band is sand: the page's own
 * colour is not known yet.
 *
 * The blocks use the shared `skeleton` class (a slow sheen, still under
 * reduced motion). They are empty, so there is nothing for a screen reader to
 * read; `aria-busy` on the page says it is loading.
 */

function Bone({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

const LINE_WIDTHS = ["w-full", "w-[94%]", "w-[98%]", "w-[88%]"];

/** Lines of text: uneven, and the last one short, like a paragraph. */
function Lines({ count, className }: { count: number; className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: count }, (_, i) => (
        <Bone key={i} className={cn("h-4 rounded-full", i === count - 1 ? "w-3/5" : LINE_WIDTHS[i % LINE_WIDTHS.length])} />
      ))}
    </div>
  );
}

/** The page frame. At least a screen tall, so the footer does not show and then jump away. */
function Frame({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <main className={cn("min-h-dvh", className)} aria-busy="true">
      {children}
    </main>
  );
}

/** The band that opens condition, exercise and food pages: breadcrumbs, a label, the name, a summary and a sticker. */
function TitleBand({ extra }: { extra?: ReactNode }) {
  return (
    <div className="bg-sand">
      <div className="container-hm pb-10 pt-8 md:pb-14 md:pt-12">
        <Bone className="h-4 w-56 max-w-full rounded-full" />
        <div className="mt-7 flex items-start gap-6">
          <div className="min-w-0 flex-1">
            <Bone className="h-3 w-24 rounded-full" />
            <Bone className="mt-4 h-11 w-3/4 max-w-md rounded-2xl md:h-14" />
            <Lines count={2} className="mt-6 max-w-xl" />
            {extra}
          </div>
          <Bone className="hidden size-[140px] flex-none rounded-full md:block" />
        </div>
      </div>
    </div>
  );
}

/** The band of a page built on <PageHero>: breadcrumbs, a title and a lede. */
function HeroBand({ children }: { children?: ReactNode }) {
  return (
    <div className="bg-sand">
      <div className="container-hm pb-12 pt-8 md:pb-16 md:pt-12">
        <Bone className="h-4 w-40 rounded-full" />
        <Bone className="mt-8 h-11 w-2/3 max-w-lg rounded-2xl md:h-16" />
        <Lines count={2} className="mt-6 max-w-xl" />
        {children}
      </div>
    </div>
  );
}

export function ArticleSkeleton() {
  return (
    <Frame>
      <div className="bg-sand">
        <div className="container-hm grid gap-10 pb-12 pt-8 md:pb-16 md:pt-12 lg:grid-cols-[1.25fr_0.75fr] lg:items-center lg:gap-14">
          <div>
            <Bone className="h-4 w-44 rounded-full" />
            <Bone className="mt-7 h-10 max-w-2xl rounded-2xl md:h-14" />
            <Bone className="mt-3 h-10 w-4/5 max-w-xl rounded-2xl md:h-14" />
            <Lines count={2} className="mt-7 max-w-lg" />
            <div className="mt-8 flex gap-2">
              <Bone className="h-[34px] w-20 rounded-full" />
              <Bone className="h-[34px] w-24 rounded-full" />
            </div>
          </div>
          <Bone className="mx-auto aspect-[4/3] w-full max-w-[420px] rounded-[28px] lg:max-w-none" />
        </div>
      </div>
      <div className="container-hm grid gap-10 py-12 md:py-16 lg:grid-cols-[220px_minmax(0,720px)_1fr] lg:gap-12">
        <div className="hidden lg:block">
          <Bone className="h-3 w-24 rounded-full" />
          <Lines count={4} className="mt-5" />
        </div>
        <div className="min-w-0">
          <Bone className="h-48 rounded-[24px]" />
          <Lines count={5} className="mt-10" />
        </div>
      </div>
    </Frame>
  );
}

export function ConditionSkeleton() {
  return (
    <Frame>
      <TitleBand extra={<Bone className="mt-6 h-[34px] w-24 rounded-full" />} />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,720px)_1fr] lg:gap-14">
        <div className="min-w-0">
          <Bone className="h-7 w-40 rounded-full" />
          <Lines count={5} className="mt-6" />
          <Bone className="mt-10 h-7 w-52 rounded-full" />
          <Lines count={3} className="mt-6" />
        </div>
        <Bone className="h-64 rounded-[24px]" />
      </div>
    </Frame>
  );
}

export function TopicSkeleton() {
  return (
    <Frame>
      <HeroBand>
        <div className="mt-7 flex flex-wrap gap-2">
          <Bone className="h-8 w-24 rounded-full" />
          <Bone className="h-8 w-28 rounded-full" />
          <Bone className="h-8 w-24 rounded-full" />
        </div>
      </HeroBand>
      <div className="container-hm py-10 md:py-14">
        <Bone className="h-[340px] rounded-[26px]" />
        <div className="mt-12 grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {/* One card per column of the real grid. */}
          {["", "hidden sm:block", "hidden lg:block"].map((show, i) => (
            <div key={i} className={show}>
              <Bone className="aspect-[4/3] rounded-[22px]" />
              <Bone className="mt-5 h-5 w-4/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </Frame>
  );
}

export function IssueSkeleton() {
  return (
    <Frame className="bg-sand">
      <div className="container-narrow py-10 md:py-16">
        <Bone className="h-4 w-36 rounded-full" />
        <div className="mt-6 rounded-[30px] bg-paper p-6 md:p-12">
          <Bone className="h-5 w-40 rounded-full" />
          <Bone className="mt-6 h-9 w-4/5 rounded-2xl md:h-11" />
          <Lines count={2} className="mt-5" />
          <div className="dotted-rule my-8" />
          <Lines count={5} />
          <Lines count={4} className="mt-8" />
        </div>
      </div>
    </Frame>
  );
}

export function StaticPageSkeleton() {
  return (
    <Frame>
      <HeroBand />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[220px_minmax(0,720px)] lg:gap-14">
        <div className="flex gap-1.5 overflow-hidden lg:flex-col">
          {["w-20", "w-32", "w-36", "w-40", "w-20"].map((width, i) => (
            <Bone key={i} className={cn("h-9 flex-none rounded-full", width)} />
          ))}
        </div>
        <div className="min-w-0">
          <Lines count={4} />
          <Bone className="mt-10 h-7 w-48 rounded-full" />
          <Lines count={5} className="mt-6" />
        </div>
      </div>
    </Frame>
  );
}

export function ExerciseSkeleton() {
  return (
    <Frame>
      <TitleBand />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,700px)_1fr] lg:gap-14">
        <div>
          <Bone className="h-7 w-44 rounded-full" />
          <div className="mt-7 space-y-5">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Bone className="size-10 flex-none rounded-full" />
                <Lines count={2} className="flex-1" />
              </div>
            ))}
          </div>
        </div>
        <Bone className="h-72 rounded-[24px]" />
      </div>
    </Frame>
  );
}

export function FoodSkeleton() {
  return (
    <Frame>
      <TitleBand />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,560px)_1fr] lg:gap-14">
        <Bone className="h-[440px] rounded-[26px]" />
        <div>
          <Bone className="h-7 w-64 max-w-full rounded-full" />
          <Bone className="mt-6 h-6 rounded-full" />
          <Lines count={3} className="mt-8 max-w-sm" />
        </div>
      </div>
    </Frame>
  );
}
