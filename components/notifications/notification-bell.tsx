'use client'

import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label="Obvestila"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-[11px] font-semibold text-accent-foreground">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-foreground">Obvestila</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            >
              Označi vse kot prebrano
            </Button>
          )}
        </div>
        
        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Nalaganje...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-muted-foreground">Ni novih obvestil</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification) => (
                <button
                  key={notification.id}
                  onClick={() => !notification.is_read && markRead(notification.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-muted/50 ${
                    !notification.is_read ? 'bg-secondary/30' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {!notification.is_read && (
                      <div className="mt-2 h-2 w-2 flex-shrink-0 rounded-full bg-primary" />
                    )}
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        {notification.title}
                      </p>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {notification.body}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: sl,
                        })}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
