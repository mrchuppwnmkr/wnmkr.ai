import { SignUp } from '@clerk/nextjs'
import { safeReturnTo } from '@/lib/auth/return-to'

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>
}) {
  const { return_to } = await searchParams
  return (
    <div className="flex justify-center py-8">
      <SignUp forceRedirectUrl={safeReturnTo(return_to)} signInUrl="/auth/sign-in" />
    </div>
  )
}
