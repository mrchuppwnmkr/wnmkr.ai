/**
 * Rendered when entitlement cannot be determined. The guard fails closed (FR-016), so this is what
 * a Founder sees if Supabase or Clerk is unreachable — never the gated content, never a blank page.
 */
export function ServiceUnavailable() {
  return (
    <section className="mx-auto max-w-lg rounded-lg border border-amber-200 bg-amber-50 p-8 text-center">
      <h1 className="text-xl font-semibold text-amber-900">Temporarily unavailable</h1>
      <p className="mt-3 text-sm text-amber-800">
        We could not confirm your account access just now. This is on our side, not yours — please
        try again in a moment.
      </p>
    </section>
  )
}
