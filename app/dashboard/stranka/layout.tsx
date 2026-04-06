import { redirect } from 'next/navigation'
import type { ReactNode } from 'react'

/**
 * Legacy naročnik dashboard — redirects to the new /(narocnik) route group.
 * All /dashboard/stranka/* paths are served by the (narocnik) layout now.
 */
export default function LegacyDashboardLayout({ children }: { children: ReactNode }) {
  redirect('/dashboard')
}
