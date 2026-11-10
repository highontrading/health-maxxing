import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/ContactForm";
import { PageHero } from "@/components/PageHero";
import { Prose } from "@/components/Prose";
import { getPage, getSettings } from "@/lib/data";
import { renderMarkdown } from "@/lib/markdown";

export const metadata: Metadata = {
  title: "Contact",
  description: "Send the Health Maxxing editors a correction, a question or an idea for something we should cover.",
  alternates: { canonical: "/contact" },
};

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getPage("contact"), getSettings()]);
  const intro = page ? renderMarkdown(page.body).html : "";
  const email = settings.site.contactEmail;
  return (
    <main>
      <PageHero
        color="sky"
        eyebrow="Contact"
        title={
          <>
            Say hello, or <span className="serif-accent">tell us we are wrong.</span>
          </>
        }
        lede={page?.description}
        stickers={["mail", "chat"]}
        crumbs={[{ href: "/", label: "Home" }, { label: "Contact" }]}
      />
      <div className="container-hm grid gap-10 py-10 md:py-14 lg:grid-cols-[minmax(0,640px)_1fr] lg:gap-16">
        <div>
          {intro && <Prose html={intro} compact className="mb-8" />}
          <ContactForm />
        </div>
        <aside className="space-y-4">
          <div className="rounded-[24px] bg-sand p-6">
            <h2 className="eyebrow text-ink-3">Before you write</h2>
            <ul className="mt-4 space-y-3 text-[0.9375rem] leading-relaxed">
              <li>
                <strong className="font-semibold">Health question?</strong> We cannot advise on your own symptoms or treatment. Try the{" "}
                <Link href="/conditions" className="underline underline-offset-4">conditions library</Link>, then speak to a professional.
              </li>
              <li>
                <strong className="font-semibold">Found an error?</strong> Thank you. Include the page link and a source and we will fix it fast.
              </li>
              <li>
                <strong className="font-semibold">Community issue?</strong> Use the report button on the post, or tell us here.
              </li>
            </ul>
          </div>
          {email && (
            <div className="rounded-[24px] border-[1.5px] border-ink p-6">
              <h2 className="eyebrow text-ink-3">Prefer email?</h2>
              <a href={`mailto:${email}`} className="mt-3 block text-lg font-semibold underline underline-offset-4">
                {email}
              </a>
            </div>
          )}
        </aside>
      </div>
    </main>
  );
}
