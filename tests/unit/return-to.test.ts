import { describe, it, expect } from 'vitest'
import { safeReturnTo } from '@/lib/auth/return-to'

/**
 * These cases are the ones a prefix check (`startsWith('//')`) lets through. WHATWG URL parsing
 * treats a backslash as a path separator and strips leading tabs and newlines, so each of the
 * rejected values below resolves cross-origin despite starting with a single '/'.
 */
describe('safeReturnTo', () => {
  it('keeps same-origin relative paths, with their query string', () => {
    expect(safeReturnTo('/oak-calculator')).toBe('/oak-calculator')
    expect(safeReturnTo('/admin/users?q=mike')).toBe('/admin/users?q=mike')
  })

  it('rejects protocol-relative and backslash-smuggled cross-origin targets', () => {
    for (const hostile of [
      '//evil.com',
      '/\\evil.com',
      '/\\/evil.com',
      '/\t/evil.com',
      '/\n/evil.com',
      '/\r/evil.com',
    ]) {
      expect(safeReturnTo(hostile)).toBe('/')
    }
  })

  it('rejects anything that is not a relative path', () => {
    expect(safeReturnTo('https://evil.com')).toBe('/')
    expect(safeReturnTo('javascript:alert(1)')).toBe('/')
    expect(safeReturnTo('oak-calculator')).toBe('/')
    expect(safeReturnTo(null)).toBe('/')
    expect(safeReturnTo(undefined)).toBe('/')
    expect(safeReturnTo('')).toBe('/')
  })

  it('drops any fragment rather than reflecting it', () => {
    expect(safeReturnTo('/a#b')).toBe('/a')
  })
})
