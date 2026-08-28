import { notFound } from 'next/navigation'
import { requireRole } from '@/lib/auth/require-role'

/**
 * The admin gate. Refusal is notFound(), not a 403: an admin refusal must not disclose that the
 * route exists (FR-015). `unavailable` also returns notFound() rather than an error page, for the
 * same reason — a distinguishable response is itself a disclosure.
 */
export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const result = await requireRole({ role: 'admin' })
  if (!result.ok) notFound()
  return <>{children}</>
}
