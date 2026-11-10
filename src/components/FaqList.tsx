import type { Faq } from "@/lib/types";
import { Icon } from "@/components/Icon";

export function FaqList({ faqs }: { faqs: Faq[] }) {
  if (!faqs.length) return null;
  return (
    <section aria-labelledby="faq-heading" className="mt-14">
      <h2 id="faq-heading" className="text-[1.5rem] font-medium tracking-[-0.025em]">
        Quick questions
      </h2>
      <div className="mt-5 divide-y-[1.5px] divide-ink rounded-[22px] border-[1.5px] border-ink">
        {faqs.map((f) => (
          <details key={f.q} className="group px-5 py-1 open:bg-tone-soft first:rounded-t-[20px] last:rounded-b-[20px]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-3.5 text-[1.0625rem] font-semibold leading-snug [&::-webkit-details-marker]:hidden">
              {f.q}
              <span className="flex size-8 flex-none items-center justify-center rounded-full border-[1.5px] border-ink transition-transform group-open:rotate-45 group-open:bg-ink group-open:text-paper">
                <Icon name="plus" size={16} />
              </span>
            </summary>
            <p className="pb-4 pr-10 text-[1rem] leading-relaxed text-ink-2 group-open:text-tone-ink">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
