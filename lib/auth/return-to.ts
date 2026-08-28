/**
 * Post-sign-in redirect target validation. Pure and dependency-free — deliberately its own module
 * rather than living in require-role.ts, which is `server-only` and therefore not directly
 * testable.
 *
 * Only same-origin relative paths are ever returned. A prefix check is not enough: WHATWG URL
 * parsing treats a backslash as a path separator for special schemes and strips leading tabs and
 * newlines, so `/\evil.com` and `/<TAB>/evil.com` both survive a `startsWith('//')` test and then
 * resolve cross-origin. Resolving against a sentinel origin and comparing is the only check that
 * actually holds.
 */
export function safeReturnTo(candidate: string | null | undefined): string {
  if (!candidate || !candidate.startsWith('/')) return '/'
  try {
    const sentinel = 'https://return-to.invalid'
    const url = new URL(candidate, sentinel)
    if (url.origin !== sentinel) return '/'
    return url.pathname + url.search
  } catch {
    return '/'
  }
}
