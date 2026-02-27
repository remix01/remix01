# Real-Time Notifications Implementation

## Overview
This implementation adds real-time push notifications to LiftGO using Supabase Realtime. Users will be notified immediately when a craftsman responds to their inquiry, with notifications appearing in a bell icon in the navbar.

## Components Created

### 1. `hooks/useRealtimeNotifications.ts`
A custom React hook that:
- Subscribes to real-time notifications via Supabase Realtime
- Loads existing unread notifications on mount
- Provides methods to mark notifications as read individually or all at once
- Requests browser notification permissions
- Shows browser notifications when permission is granted
- Returns notifications, unreadCount, and control methods

**Usage:**
```typescript
const { notifications, unreadCount, markAsRead, markAllAsRead, requestPermission } = useRealtimeNotifications(userId)
```

### 2. `components/notifications/NotificationBell.tsx`
A client component that displays:
- Bell icon with unread count badge (hidden if count = 0)
- Dropdown panel with notification list
- Each notification shows: type-specific icon, title, body, time ago, and unread indicator
- "Mark all as read" button at top of dropdown
- Empty state message
- Navigates to resource when clicked
- Fully styled with design tokens and semantic colors

**Usage:**
```typescript
<NotificationBell userId={session?.user?.id} />
```

### 3. Updated `components/navbar.tsx`
- Added import for `createClient` and `NotificationBell`
- Added `userId` state management with Supabase auth check on mount
- Added `NotificationBell` component to desktop navigation bar
- Maintains existing styling and layout

### 4. Updated `supabase/migrations/add_notifications_table.sql`
- Updated existing migrations file with:
  - Support for new notification types (offer_received, escrow_captured, escrow_released, dispute_opened, message_received)
  - New fields: message, resource_id, resource_type, link, updated_at
  - Enabled Supabase Realtime for real-time subscriptions
  - RLS policies for user data isolation

### 5. Updated `lib/jobs/workers/emailWorker.ts`
- Added `recipientUserId` to `EmailJobPayload` interface
- After sending emails, inserts corresponding notification records
- Maps email types to notification types and creates appropriate titles/bodies
- Notification insertion is non-blocking (doesn't fail email sending if it fails)

## Flow

1. **Event Occurs** → Backend enqueues email job with recipientUserId
2. **Email Sent** → emailWorker sends email AND inserts notification record
3. **Database Insert** → Supabase triggers Realtime broadcast
4. **Realtime Subscription** → useRealtimeNotifications hook receives new notification
5. **UI Update** → NotificationBell updates notifications list and unread count
6. **Browser Notification** → If user has permission, browser shows notification
7. **User Interaction** → Click notification to mark as read or navigate

## Integration Points

### In API Routes (e.g., `/api/escrow/release/route.ts`)
When enqueueing email jobs, pass the recipient's user ID:
```typescript
await enqueue('send_release_email', {
  transactionId: escrow.id,
  recipientEmail: escrow.customer_email,
  recipientName: escrow.customer_name,
  recipientUserId: escrow.customer_id,  // Add this
  partnerName: escrow.partner_name,
  amount: escrow.amount_cents,
})
```

### Notification Types
- `offer_received` - Craftsman made an offer
- `escrow_captured` - Payment captured/confirmed
- `escrow_released` - Payment released to partner
- `dispute_opened` - Dispute opened on transaction
- `message_received` - New message received

## Features

✅ Real-time updates with Supabase Realtime
✅ Unread badge on bell icon
✅ Dropdown notification panel
✅ Type-specific icons and colors
✅ Mark individual or all as read
✅ Browser notification permission handling
✅ RLS policies for security
✅ Responsive design matching existing navbar
✅ Time ago formatting
✅ Empty state message
✅ No breaking changes to existing functionality

## Testing

1. Ensure Supabase Realtime is enabled in your project
2. Run the migrations to create the notifications table
3. Test by triggering an escrow event (release, refund, etc.)
4. Check that notification appears in bell icon
5. Verify Realtime subscription works by checking browser console for no errors
6. Click notification to mark as read

## Notes

- The existing `lib/notifications.ts` and `components/liftgo/NotificationBell.tsx` are preserved
- The new `useRealtimeNotifications` hook is optimized for real-time updates
- All API routes need to be updated to pass `recipientUserId` when enqueueing email jobs
- Browser notifications require user permission - the hook handles permission requests
