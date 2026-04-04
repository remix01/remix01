'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { NarocnikSidebar } from '@/components/narocnik/sidebar'
import { NarocnikBottomNav } from '@/components/narocnik/bottom-nav'
import { NotificationBellClient } from '@/components/liftgo/NotificationBellClient'

interface NarocnikLayoutClientProps {
  fullName: string | null
  userId: string
  children: React.ReactNode
}

export function NarocnikLayoutClient({
  fullName,
  userId,
  children,
}: NarocnikLayoutClientProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const pathname = usePathname()

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false)
  }, [pathname])

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <div className="hidden md:block fixed left-0 top-0 h-screen w-64 border-r z-40">
        <NarocnikSidebar fullName={fullName} />
      </div>

      {/* Mobile Sidebar */}
      <div
        className={`fixed inset-0 bg-black/50 md:hidden z-30 transition-opacity ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />
      <div
        className={`fixed left-0 top-0 h-screen w-64 bg-background border-r z-40 transition-transform md:hidden ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <NarocnikSidebar fullName={fullName} />
      </div>

      {/* Main Content */}
      <div className="flex flex-col flex-1 md:ml-64 pb-20 md:pb-0">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b bg-background">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="md:hidden p-2 hover:bg-muted rounded-lg"
            aria-label="Toggle sidebar"
          >
            {sidebarOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
          <div className="flex-1" />
          <NotificationBellClient userId={userId} />
        </div>

        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 md:hidden border-t bg-background z-20">
        <NarocnikBottomNav />
      </div>
    </div>
  )
}
