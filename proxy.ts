import { clerkMiddleware } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

/**
 * Next.js 16 renamed the `middleware` convention to `proxy`.
 *
 * This establishes the Clerk auth context and stamps the requested path onto the request headers
 * so a segment-layout guard can build an accurate `return_to` (FR-006). It performs NO
 * authorization: `createRouteMatcher` is deprecated, and a matcher list fails open the moment
 * someone adds a route and forgets to list it. Authorization lives at the resource, in
 * `lib/auth/require-role.ts`. See specs/001-auth-user-model/research.md R-001 and Constitution
 * Principle III.
 */
export default clerkMiddleware(async (_auth, req) => {
  const headers = new Headers(req.headers)
  headers.set('x-pathname', req.nextUrl.pathname + req.nextUrl.search)
  return NextResponse.next({ request: { headers } })
})

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    '/__clerk/(.*)',
  ],
}
