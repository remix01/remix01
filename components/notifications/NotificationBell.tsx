'use client'

import { Bell } from 'lucide-react'

interface NotificationBellProps {
  userId: string | null
}

export function NotificationBell({ userId }: NotificationBellProps) {
  // Only render bell if user is authenticated
  if (!userId) {
    return null
  }

  return (
    <button
      className="relative flex items-center justify-center w-10 h-10 rounded-lg hover:bg-secondary transition-colors"
      title="Obvestila"
    >
      <Bell className="w-5 h-5" />
    </button>
  )
}

type NotificationType = 'offer_received' | 'escrow_captured' | 'escrow_released' | 'dispute_opened' | 'message_received'

const notificationIcons: Record<NotificationType, React.ReactNode> = {
  offer_received: <MessageSquare className="w-4 h-4" />,
  escrow_captured: <CheckCircle className="w-4 h-4" />,
  escrow_released: <CheckCircle className="w-4 h-4" />,
  dispute_opened: <AlertCircle className="w-4 h-4" />,
  message_received: <MessageSquare className="w-4 h-4" />,
}

const notificationColors: Record<NotificationType, string> = {
  offer_received: 'bg-blue-100 text-blue-700',
  escrow_captured: 'bg-yellow-100 text-yellow-700',
  escrow_released: 'bg-green-100 text-green-700',
  dispute_opened: 'bg-red-100 text-red-700',
  message_received: 'bg-purple-100 text-purple-700',
}

export function NotificationBell({ userId }: NotificationBellProps) {
  // Only render bell if user is authenticated
  if (!userId) {
    return null
  }

  const { notifications, unreadCount, markAsRead, markAllAsRead } = useRealtimeNotifications(userId)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const getTimeAgo = (date: string): string => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'now'
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'yesterday'
    return `${diffDays}d ago`
  }

  if (!userId) return null

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Notifications"
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-[20px] flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-96 bg-background border border-border rounded-lg shadow-lg z-50">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <h3 className="font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllAsRead()}
                className="text-xs text-primary hover:underline font-medium"
              >
                Mark all as read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">
                <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No new notifications</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  onClick={() => {
                    if (!notification.read) {
                      markAsRead(notification.id)
                    }
                    setIsOpen(false)
                  }}
                  className={`p-4 border-b border-border hover:bg-accent cursor-pointer transition-colors ${
                    !notification.read ? 'bg-muted/50' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notificationColors[notification.type as NotificationType] || 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {notificationIcons[notification.type as NotificationType] || <Clock className="w-4 h-4" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <p
                        className={`text-sm ${
                          notification.read
                            ? 'font-normal text-muted-foreground'
                            : 'font-semibold text-foreground'
                        }`}
                      >
                        {notification.title}
                      </p>

                      {/* Body */}
                      <p className="text-sm text-muted-foreground line-clamp-2 mt-1">
                        {notification.body}
                      </p>

                      {/* Time ago */}
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {getTimeAgo(notification.createdAt)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.read && (
                      <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0 mt-2" />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-border bg-muted/30">
              <button
                onClick={() => setIsOpen(false)}
                className="text-sm text-primary hover:underline w-full text-center font-medium"
              >
                View all notifications
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
