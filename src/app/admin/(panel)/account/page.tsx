import type { Metadata } from "next";
import Link from "next/link";
import { Card, PageHeader } from "@/components/admin/ui";
import { PasswordForm } from "@/components/auth/AuthForms";
import { requireStaff } from "@/lib/auth";

export const metadata: Metadata = { title: "Your account" };

export default async function AdminAccountPage() {
  const user = await requireStaff();
  return (
    <>
      <PageHeader title="Your account" description={`Signed in as ${user.email} (${user.role}).`} />
      <div className="grid max-w-3xl gap-5">
        <Card title="Change your password">
          <PasswordForm minLength={10} />
          <p className="field-help mt-3">Changing it signs you out everywhere else. Use a long password that you do not use on any other site.</p>
        </Card>
        <Card title="Your public profile">
          <p className="text-ink-2">Your display name, sticker and bio are what members see on the forum.</p>
          <Link href="/account" className="btn btn-outline mt-3">
            Edit profile
          </Link>
        </Card>
      </div>
    </>
  );
}
