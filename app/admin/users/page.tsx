import { listUsers } from './actions'
import { UserTable } from './user-table'

export const dynamic = 'force-dynamic'

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>
}) {
  const { q } = await searchParams
  const result = await listUsers({ query: q })

  if (!result.ok) {
    return <p className="text-sm text-stone-600">Could not load users ({result.error}).</p>
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-2 text-sm text-stone-600">
        Grant Founder access to onboard a private-beta user. Founders receive Cellar Master
        entitlement by default and are never charged.
      </p>

      <form className="mt-6" action="/admin/users">
        <input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email"
          className="w-full max-w-sm rounded border border-stone-300 px-3 py-2 text-sm"
        />
      </form>

      <UserTable users={result.data.users} />
    </section>
  )
}
