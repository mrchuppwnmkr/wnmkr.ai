import type { Metadata } from 'next'
import { ClerkProvider, Show, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs'
import Link from 'next/link'
import './globals.css'

export const metadata: Metadata = {
  title: 'wnmkr.ai — AI Winemaking Consultant',
  description:
    'An agentic winemaking consultant built on the combined experience of Steve Burch and Michael Chupp. Lodi, Livermore and Russian River Valley.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      {/* ClerkProvider goes inside <body>, not wrapping <html> — Core 3. See research R-009. */}
      <body className="min-h-screen bg-stone-50 text-stone-900 antialiased">
        <ClerkProvider>
          <header className="border-b border-stone-200 bg-white">
            <nav className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
              <Link href="/" className="font-semibold tracking-tight">
                wnmkr<span className="text-rose-800">.ai</span>
              </Link>
              <div className="flex items-center gap-4 text-sm">
                <Link href="/about" className="hover:text-rose-800">
                  About
                </Link>
                <Link href="/oak-calculator" className="hover:text-rose-800">
                  Oak Calculator
                </Link>
                <Show when="signed-out">
                  <SignInButton mode="redirect" />
                  <SignUpButton mode="redirect" />
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </nav>
          </header>
          <main className="mx-auto max-w-5xl px-6 py-12">{children}</main>
          <footer className="border-t border-stone-200 py-8 text-center text-xs text-stone-500">
            Lodi · Livermore · Russian River Valley
          </footer>
        </ClerkProvider>
      </body>
    </html>
  )
}
