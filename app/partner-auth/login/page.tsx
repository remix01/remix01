import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Page() {
  redirect('/prijava?flow=partner-auth-login-deprecated')
}
