import { redirect } from 'next/navigation'

// This page created auth users without a profiles row, leaving accounts broken.
// All registration now goes through /registracija which correctly creates both.
export default function SignUpPage() {
  redirect('/registracija')
}
