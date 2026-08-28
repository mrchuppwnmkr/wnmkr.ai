export {}

declare global {
  /**
   * Custom claims added in the Clerk dashboard under Sessions -> Customize session token.
   *
   * Keep this small. The session token is a cookie, browsers cap cookies at 4KB, and Clerk's own
   * default claims consume most of it — roughly 1.2KB is available. Exceeding it makes the cookie
   * silently fail to set. See specs/001-auth-user-model/research.md R-004.
   */
  interface CustomJwtSessionClaims {
    role?: string
    tier?: string
  }
}
