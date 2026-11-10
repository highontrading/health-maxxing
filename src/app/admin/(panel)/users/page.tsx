import type { Metadata } from "next";
import Form from "next/form";
import Link from "next/link";
import { userAction } from "@/app/admin/actions";
import { ConfirmSubmit } from "@/components/admin/ConfirmSubmit";
import { day, EmptyState, FilterTabs, Notice, one, PageHeader, Pager } from "@/components/admin/ui";
import { Sticker } from "@/components/stickers/Sticker";
import { listMembers } from "@/lib/admin/queries";
import { requireStaff } from "@/lib/auth";
import { cn } from "@/lib/cn";

export const metadata: Metadata = { title: "Members" };

export default async function UsersPage({ searchParams }: PageProps<"/admin/users">) {
  const me = await requireStaff();
  const query = await searchParams;
  const q = one(query.q);
  const filter = one(query.filter);
  const { rows, total, page, pages } = await listMembers({ q, filter, page: Number(one(query.page)) || 1 });
  const isAdmin = me.role === "admin";

  const backParams = new URLSearchParams();
  for (const key of ["q", "filter", "page"]) if (one(query[key])) backParams.set(key, one(query[key]));
  const back = backParams.size ? `/admin/users?${backParams}` : "/admin/users";

  return (
    <>
      <PageHeader
        title="Members"
        description="Everyone with an account. Suspending signs a member out and stops them posting; their existing posts stay unless you also hide them."
      />
      <Notice query={query} />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <FilterTabs
          base="/admin/users"
          query={query}
          name="filter"
          tabs={[
            { value: "", label: "Everyone" },
            { value: "staff", label: "Staff" },
            { value: "suspended", label: "Suspended" },
          ]}
        />
        <Form action="/admin/users" className="flex items-center gap-2">
          {filter && <input type="hidden" name="filter" value={filter} />}
          <input type="search" name="q" defaultValue={q} placeholder="Name, @handle or email" aria-label="Search members" className="input h-10 w-64 max-w-full py-0 text-sm" />
          <button type="submit" className="btn btn-outline btn-sm h-10">
            Search
          </button>
        </Form>
      </div>

      <div className="admin-card overflow-hidden">
        {rows.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Member</th>
                  {isAdmin && <th>Email</th>}
                  <th>Role</th>
                  <th className="num">Posts</th>
                  <th>Joined</th>
                  <th>Last sign-in</th>
                  <th>
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => {
                  const staff = u.role === "admin" || u.role === "editor";
                  const canChange = u.id !== me.id && (isAdmin || !staff);
                  return (
                    <tr key={u.id}>
                      <td>
                        <span className="flex items-center gap-2.5">
                          <span className={cn(`tone-${u.color}`, "flex size-9 flex-none items-center justify-center rounded-full bg-tone-soft")}>
                            <Sticker name={u.sticker} size={24} flat />
                          </span>
                          <span className="min-w-0 leading-tight">
                            <span className="block truncate font-semibold">{u.name}</span>
                            <span className="block truncate text-xs text-ink-3">@{u.handle}</span>
                          </span>
                          {u.banned && <span className="badge badge-pink">Suspended</span>}
                          {u.id === me.id && <span className="badge badge-gray">You</span>}
                        </span>
                      </td>
                      {isAdmin && <td className="text-ink-2">{u.email}</td>}
                      <td>
                        {isAdmin && canChange ? (
                          <form action={userAction} className="flex items-center gap-1">
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="op" value="role" />
                            <input type="hidden" name="_back" value={back} />
                            <select name="role" defaultValue={u.role} aria-label={`Role of ${u.name}`} className="select h-8 w-auto py-0 pl-2.5 pr-8 text-sm">
                              <option value="member">Member</option>
                              <option value="editor">Editor</option>
                              <option value="admin">Admin</option>
                            </select>
                            <button type="submit" className="btn btn-ghost btn-sm">
                              Set
                            </button>
                          </form>
                        ) : (
                          <span className={cn("badge", staff ? "badge-blue" : "badge-gray")}>{u.role.charAt(0).toUpperCase() + u.role.slice(1)}</span>
                        )}
                      </td>
                      <td className="num">
                        {u.posts ? (
                          <Link href={`/admin/community?q=${encodeURIComponent(u.handle)}`} className="underline underline-offset-2">
                            {u.posts}
                          </Link>
                        ) : (
                          0
                        )}
                      </td>
                      <td className="whitespace-nowrap text-ink-2">{day(u.createdAt)}</td>
                      <td className="whitespace-nowrap text-ink-2">{day(u.lastSeenAt)}</td>
                      <td className="whitespace-nowrap text-right">
                        {canChange && (
                          <form action={userAction} className="inline-flex items-center gap-1">
                            <input type="hidden" name="id" value={u.id} />
                            <input type="hidden" name="_back" value={back} />
                            {isAdmin && (
                              <button type="submit" name="op" value="reset" className="btn btn-ghost btn-sm" title="Create a one-time link this member can use to choose a new password">
                                Reset link
                              </button>
                            )}
                            {u.banned ? (
                              <button type="submit" name="op" value="unban" className="btn btn-ghost btn-sm">
                                Lift suspension
                              </button>
                            ) : (
                              <>
                                <button type="submit" name="op" value="ban" className="btn btn-ghost btn-sm">
                                  Suspend
                                </button>
                                <ConfirmSubmit name="op" value="purge" confirm="Suspend and hide all posts" title="For spam accounts: suspends the member and hides everything they posted">
                                  Spam
                                </ConfirmSubmit>
                              </>
                            )}
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title={q || filter ? "No member matches." : "No members yet."} />
        )}
      </div>
      <p className="mt-3 text-sm text-ink-3">
        {total.toLocaleString("en-US")} {total === 1 ? "member" : "members"}
        {isAdmin ? ". Editors can write and moderate; admins can also change settings, roles, tokens and the autopilot." : ". Email addresses are shown to admins only."}
      </p>
      <Pager base="/admin/users" query={query} page={page} pages={pages} />
    </>
  );
}
