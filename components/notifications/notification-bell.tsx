'use client'

import { Bell, Package, Star, CheckCircle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useNotifications } from '@/hooks/use-notifications'
import { formatDistanceToNow } from 'date-fns'
import { sl } from 'date-fns/locale'

interface Notification {
  id: string
  user_id: string
  type: string
  title: string
  body: string
  data: Record<string, any>
  read: boolean
  created_at: string
}

export function NotificationBell() {
  const { notifications, unreadCount, loading, markRead, markAllRead } = useNotifications()

  const getIconForType = (type: string) => {
    switch (type) {
      case 'nova_ponudba':
      case 'offer_received':
        return <Package className="h-4 w-4 text-blue-600" />
      case 'nova_ocena':
        return <Star className="h-4 w-4 text-amber-600" />
      case 'ponudba_sprejeta':
      case 'offer_accepted':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'novo_sporocilo':
      case 'message_received':
        return <MessageSquare className="h-4 w-4 text-purple-600" />
      default:
        return <Bell className="h-4 w-4 text-slate-600" />
    }
  }

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
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[11px] font-semibold text-white animate-pulse">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h3 className="font-semibold text-slate-900">Obvestila</h3>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={markAllRead}
              className="h-auto px-2 py-1 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              Vse prebrano
            </Button>
          )}
        </div>
        
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-slate-500">Nalaganje...</p>
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <p className="text-sm text-slate-500">Ni novih obvestil</p>
            </div>
          ) : (
            <div className="divide-y">
              {notifications.map((notification: Notification) => (
                <button
                  key={notification.id}
                  onClick={() => !notification.read && markRead(notification.id)}
                  className={`w-full px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                    !notification.read
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {getIconForType(notification.type)}
                    <div className="flex-1 space-y-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900">
                        {notification.title}
                      </p>
                      <p className="text-xs text-slate-600 line-clamp-1">
                        {notification.body}
                      </p>
                      <p className="text-xs text-slate-400">
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

        <div className="border-t px-4 py-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-slate-600 hover:text-slate-900"
          >
            Vsa obvestila
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

