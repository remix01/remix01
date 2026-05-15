import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default function Page() {
  redirect('/registracija-mojster?flow=partner-auth-sign-up-deprecated')
}
