import { SignIn } from '@clerk/nextjs'
import { safeReturnTo } from '@/lib/auth/return-to'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const { return_to } = await searchParams
  // Validated as a same-origin relative path, so a crafted link cannot turn this into an open
  // redirect (contracts/role-guard.md).
  const redirectUrl = safeReturnTo(return_to)

  return (
    <div className="flex justify-center py-8">
      <SignIn forceRedirectUrl={redirectUrl} signUpUrl="/auth/sign-up" />
    </div>
  )
}
