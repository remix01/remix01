'use client'

import { Menu } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet'
import { AdminSidebar } from './AdminSidebar'

type Vloga = 'SUPER_ADMIN' | 'MODERATOR' | 'OPERATER'

interface AdminHeaderProps {
  user?: {
    ime: string
    priimek: string
    email: string
    vloga: Vloga
  }
}

export function AdminHeader({ user }: AdminHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Odpri meni</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-64 p-0">
          {user && <AdminSidebar user={user} />}
        </SheetContent>
      </Sheet>

      <div className="flex flex-1 items-center justify-between">
        <div className="flex-1" />
        
        <div className="flex items-center gap-2">
          {user && (
            <div className="hidden text-right sm:block">
              <p className="text-sm font-medium">{user.ime} {user.priimek}</p>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
