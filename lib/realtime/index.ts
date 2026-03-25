/**
 * Real-time Features Module
 *
 * Main entry point for real-time functionality
 */

export type { UserPresence } from './presence'
export { setUserOnline, setUserAway, setUserOffline, getUserPresence, getOnlineUsersInRoom, addUserToRoom, removeUserFromRoom, getTotalOnlineUsers } from './presence'

export type { ActivityEvent } from './activity-stream'
export { logActivity, getActivityStream, clearActivityStream } from './activity-stream'

export type { Notification } from './notifications'
export {
  createNotification,
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  clearAllNotifications,
  broadcastNotification,
} from './notifications'
