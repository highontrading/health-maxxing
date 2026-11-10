import type { Metadata } from "next";
import { revokeTokenAction } from "@/app/admin/actions";
import { TokenCreator } from "@/components/admin/AutopilotClient";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { Card, day, EmptyState, Notice, PageHeader, stamp } from "@/components/admin/ui";
import { COLLECTIONS } from "@/lib/admin/collections";
import { listTokens } from "@/lib/admin/queries";
import { requireAdmin } from "@/lib/auth";
import { siteUrl } from "@/lib/site";
import { PageTransition } from "@/components/motion/PageTransition";

export const metadata: Metadata = { title: "API tokens" };

export default async function ApiTokensPage({ searchParams }: PageProps<"/admin/api">) {
  await requireAdmin();
  const [query, tokens] = await Promise.all([searchParams, listTokens()]);
  const base = `${siteUrl()}/api/v1`;
  return (
    <PageTransition variant="panel">
      <PageHeader
        title="API tokens"
        description="Tokens let a script or an AI agent read and change content without signing in. Anything a token creates starts as a draft unless it asks to publish."
      />
      <Notice query={query} />
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Card title="Create a token">
            <TokenCreator />
            <p className="field-help mt-3">A token can do everything an editor can do with content. Treat it like a password, and revoke it here if it leaks.</p>
          </Card>
          <Card title="Tokens" flush className="overflow-hidden">
            {tokens.length ? (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Starts with</th>
                      <th>Created</th>
                      <th>Last used</th>
                      <th>
                        <span className="sr-only">Actions</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {tokens.map((t) => (
                      <tr key={t.id}>
                        <td className="font-medium">
                          {t.name} {t.revoked && <span className="badge badge-gray ml-1">Revoked</span>}
                        </td>
                        <td>
                          <code className="font-mono text-sm">{t.prefix}…</code>
                        </td>
                        <td className="whitespace-nowrap text-ink-2">{day(t.createdAt)}</td>
                        <td className="whitespace-nowrap text-ink-2">{t.lastUsedAt ? stamp(t.lastUsedAt) : "Never"}</td>
                        <td className="text-right">
                          {!t.revoked && (
                            <form action={revokeTokenAction}>
                              <input type="hidden" name="id" value={t.id} />
                              <ConfirmSubmit confirm="Revoke">Revoke</ConfirmSubmit>
                            </form>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState sticker="shield" title="No tokens yet." />
            )}
          </Card>
        </div>

        <Card title="Using the API">
          <div className="space-y-4 text-sm">
            <p className="text-ink-2">
              Send the token in the <code className="rounded bg-sand-2 px-1">Authorization</code> header. <code className="rounded bg-sand-2 px-1">GET {base}</code> describes every collection and its fields.
            </p>
            <div>
              <p className="font-semibold">List drafts</p>
              <pre className="mt-1 overflow-x-auto rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper">
                <code>{`curl "${base}/articles?status=draft" \\\n  -H "Authorization: Bearer $HM_TOKEN"`}</code>
              </pre>
            </div>
            <div>
              <p className="font-semibold">Create a glossary term</p>
              <pre className="mt-1 overflow-x-auto rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper">
                <code>{`curl -X POST ${base}/glossary \\\n  -H "Authorization: Bearer $HM_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"term":"Ferritin","definition":"A protein that stores iron…",\n       "category":"nutrition","status":"published"}'`}</code>
              </pre>
            </div>
            <div>
              <p className="font-semibold">Change one field</p>
              <pre className="mt-1 overflow-x-auto rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper">
                <code>{`curl -X PATCH ${base}/articles/<id-or-slug> \\\n  -H "Authorization: Bearer $HM_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"fact_check":"verified"}'`}</code>
              </pre>
            </div>
            <div>
              <p className="font-semibold">Queue an autopilot topic, then draft it</p>
              <pre className="mt-1 overflow-x-auto rounded-xl bg-ink p-3 text-xs leading-relaxed text-paper">
                <code>{`curl -X POST ${base}/autopilot/topics \\\n  -H "Authorization: Bearer $HM_TOKEN" \\\n  -H "Content-Type: application/json" \\\n  -d '{"topic":"How to read a food label in 30 seconds"}'\n\ncurl -X POST ${base}/autopilot/run \\\n  -H "Authorization: Bearer $HM_TOKEN"`}</code>
              </pre>
            </div>
            <p className="text-ink-3">
              Collections: {COLLECTIONS.map((c) => c.key).join(", ")}. Limit: 300 requests a minute per token.
            </p>
          </div>
        </Card>
      </div>
    </PageTransition>
  );
}
