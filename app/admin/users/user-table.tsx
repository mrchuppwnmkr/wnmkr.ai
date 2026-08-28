'use client'

import { useState, useTransition } from 'react'
import { grantFounder, revokeFounder, type AdminUserRow } from './actions'
import type { Tier } from '@/lib/auth/roles'

/**
 * Presentation only. Hiding a button is never the control — every mutation re-checks admin status
 * on the server (Constitution Principle III).
 */
export function UserTable({ users }: { users: AdminUserRow[] }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)
  const [tier, setTier] = useState<Tier>('cellar_master')

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await fn()
      setMessage(result.ok ? 'Done.' : `Refused: ${result.error}`)
    })
  }

  if (users.length === 0) {
    return <p className="mt-6 text-sm text-stone-600">No users found.</p>
  }

  return (
    <div className="mt-6">
      {message && <p className="mb-4 text-sm text-stone-700">{message}</p>}

      <label className="mb-4 block text-sm">
        Founder tier{' '}
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as Tier)}
          className="rounded border border-stone-300 px-2 py-1"
        >
          <option value="cellar_master">Cellar Master (default)</option>
          <option value="winemaker">Winemaker</option>
          <option value="vintner">Vintner</option>
        </select>
      </label>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b border-stone-300 text-stone-500">
            <th className="py-2 font-medium">Email</th>
            <th className="py-2 font-medium">Role</th>
            <th className="py-2 font-medium">Tier</th>
            <th className="py-2 font-medium">Source</th>
            <th className="py-2 font-medium">Joined</th>
            <th className="py-2 font-medium">Action</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-b border-stone-200">
              <td className="py-2">
                {u.email}
                {!u.is_active && <span className="ml-2 text-xs text-stone-400">(deactivated)</span>}
              </td>
              <td className="py-2">{u.role}</td>
              <td className="py-2">{u.tier}</td>
              <td className="py-2">{u.entitlement_source}</td>
              <td className="py-2">{new Date(u.created_at).toLocaleDateString()}</td>
              <td className="py-2">
                {u.role === 'founder' ? (
                  <button
                    disabled={pending}
                    onClick={() => run(() => revokeFounder({ clerkUserId: u.clerk_user_id }))}
                    className="rounded border border-stone-300 px-2 py-1 text-xs hover:bg-stone-100 disabled:opacity-50"
                  >
                    Revoke Founder
                  </button>
                ) : (
                  <button
                    disabled={pending}
                    onClick={() => run(() => grantFounder({ clerkUserId: u.clerk_user_id, tier }))}
                    className="rounded bg-rose-800 px-2 py-1 text-xs text-white hover:bg-rose-900 disabled:opacity-50"
                  >
                    Grant Founder
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
