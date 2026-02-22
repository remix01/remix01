'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Card } from '@/components/ui/card'
import { getAllNotifications, markAllAsRead } from '@/lib/notifications'
import Link from 'next/link'

const notificationColors: Record<string, string> = {
  nova_ponudba: 'bg-blue-100 border-blue-300',
  ponudba_sprejeta: 'bg-green-100 border-green-300',
  ponudba_zavrnjena: 'bg-red-100 border-red-300',
  nova_ocena: 'bg-yellow-100 border-yellow-300',
  termin_potrjen: 'bg-purple-100 border-purple-300',
  termin_opomnik: 'bg-orange-100 border-orange-300',
  placilo_prejeto: 'bg-green-100 border-green-300',
  placilo_zahtevano: 'bg-blue-100 border-blue-300',
}

const notificationDots: Record<string, string> = {
  nova_ponudba: 'bg-blue-500',
  ponudba_sprejeta: 'bg-green-500',
  ponudba_zavrnjena: 'bg-red-500',
  nova_ocena: 'bg-yellow-500',
  termin_potrjen: 'bg-purple-500',
  termin_opomnik: 'bg-orange-500',
  placilo_prejeto: 'bg-green-600',
  placilo_zahtevano: 'bg-blue-600',
}

export default async function NotificationsPage() {
  const supabase = await createClient()

  // Check authentication
  const { data: { user } } = await supabase.auth.getSession()
  if (!user) {
    redirect('/prijava')
  }

  // Fetch all notifications
  const { notifications, total } = await getAllNotifications(user.id, 1, 50)

  const getTimeAgo = (date: string) => {
    const now = new Date()
    const notifDate = new Date(date)
    const diffMs = now.getTime() - notifDate.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return 'pravkar'
    if (diffMins < 60) return `${diffMins} min`
    if (diffHours < 24) return `${diffHours} ur`
    if (diffDays === 1) return 'včeraj'
    return `${diffDays} dni`
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-3xl px-4">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">Obvestila</h1>
          {notifications.some((n) => !n.is_read) && (
            <form
              action={async () => {
                'use server'
                await markAllAsRead(user.id)
                redirect('/narocnik/obvestila')
              }}
            >
              <button
                type="submit"
                className="text-sm font-medium text-primary hover:underline"
              >
                Označi vse kot prebrano
              </button>
            </form>
          )}
        </div>

        {/* Notifications List */}
        {notifications.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-500">Ni novih obvestil</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <Link key={notification.id} href={notification.link || '#'}>
                <Card
                  className={`p-4 cursor-pointer transition-all hover:shadow-md ${
                    notificationColors[notification.type] || 'bg-gray-100'
                  } ${!notification.is_read ? 'border-2' : 'border'}`}
                >
                  <div className="flex items-start gap-4">
                    {/* Colored dot */}
                    <div
                      className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${
                        notificationDots[notification.type] || 'bg-gray-400'
                      }`}
                    />

                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      <h3
                        className={`text-base ${
                          notification.is_read
                            ? 'font-normal text-gray-700'
                            : 'font-semibold text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </h3>

                      {/* Message */}
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>

                      {/* Time ago */}
                      <p className="text-xs text-gray-500 mt-2">
                        {getTimeAgo(notification.created_at)}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!notification.is_read && (
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                    )}
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination info */}
        {total > 50 && (
          <div className="mt-8 text-center">
            <p className="text-sm text-gray-600">
              Prikazujem {notifications.length} od {total} obvestil
            </p>
          </div>
        )}

        {/* Back link */}
        <div className="mt-8">
          <Link href="/narocnik/dashboard" className="text-primary hover:underline">
            ← Nazaj na dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
