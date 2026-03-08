/**
 * TaskSLAMonitor Component (Example Template)
 * 
 * Demonstrates how to use the useSlaMonitor hook to display
 * real-time SLA status, countdown, and warnings.
 * 
 * This is a template - customize styling and layout for your app.
 */

'use client'

import { useSlaMonitor } from '@/lib/hooks/tasks'
import { getSLAStatusColor } from '@/lib/task-engine/sla-utils'
import type { SLAStatus } from '@/lib/task-engine/types'

interface TaskSLAMonitorProps {
  taskId: string
  onWarning?: () => void
  onExpired?: () => void
}

export function TaskSLAMonitor({
  taskId,
  onWarning,
  onExpired,
}: TaskSLAMonitorProps) {
  const {
    status,
    timeRemaining,
    usagePercentage,
    isWarning,
    loading,
    error,
    deadline,
  } = useSlaMonitor(taskId, {
    onWarning: () => onWarning?.(),
    onExpired: () => onExpired?.(),
  })

  if (loading) {
    return (
      <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-600">Loading SLA information...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 rounded-lg border border-red-200">
        <p className="text-sm text-red-600">
          Error loading SLA information
        </p>
      </div>
    )
  }

  const statusColor = getSLAStatusColor(status)
  const statusBgColor = getStatusBgColor(status)
  const statusTextColor = getStatusTextColor(status)

  return (
    <div className={`p-4 rounded-lg border ${statusBgColor}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900">SLA Deadline</h3>
        <span
          className={`px-2 py-1 rounded text-xs font-medium ${statusTextColor}`}
        >
          {formatStatus(status)}
        </span>
      </div>

      {/* Deadline Display */}
      {deadline && (
        <p className="text-sm text-gray-600 mb-2">
          {new Date(deadline).toLocaleString()}
        </p>
      )}

      {/* Time Remaining */}
      <div className="mb-3">
        <p className={`text-lg font-bold ${getStatusTextColor(status)}`}>
          {timeRemaining.formattedTime}
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${getProgressBarColor(
              status
            )}`}
            style={{ width: `${Math.min(usagePercentage, 100)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-1 text-right">
          {usagePercentage}% SLA used
        </p>
      </div>

      {/* Warning Badge */}
      {isWarning && status !== 'expired' && (
        <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
          ⚠️ SLA deadline approaching! Task must be completed soon.
        </div>
      )}

      {/* Expired Badge */}
      {status === 'expired' && (
        <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
          ❌ SLA deadline has passed. Task is expired.
        </div>
      )}
    </div>
  )
}

/**
 * Helper function to format SLA status for display
 */
function formatStatus(status: SLAStatus): string {
  switch (status) {
    case 'urgent':
      return 'Urgent'
    case 'warning':
      return 'Warning'
    case 'on_track':
      return 'On Track'
    case 'expired':
      return 'Expired'
    case 'no_deadline':
      return 'No Deadline'
    default:
      return 'Unknown'
  }
}

/**
 * Get background color for status
 */
function getStatusBgColor(status: SLAStatus): string {
  switch (status) {
    case 'urgent':
      return 'bg-red-50 border-red-200'
    case 'warning':
      return 'bg-yellow-50 border-yellow-200'
    case 'on_track':
      return 'bg-green-50 border-green-200'
    case 'expired':
      return 'bg-gray-50 border-gray-300'
    case 'no_deadline':
      return 'bg-blue-50 border-blue-200'
    default:
      return 'bg-gray-50 border-gray-200'
  }
}

/**
 * Get text color for status
 */
function getStatusTextColor(status: SLAStatus): string {
  switch (status) {
    case 'urgent':
      return 'text-red-700 bg-red-100'
    case 'warning':
      return 'text-yellow-700 bg-yellow-100'
    case 'on_track':
      return 'text-green-700 bg-green-100'
    case 'expired':
      return 'text-gray-700 bg-gray-100'
    case 'no_deadline':
      return 'text-blue-700 bg-blue-100'
    default:
      return 'text-gray-700 bg-gray-100'
  }
}

/**
 * Get progress bar color based on status
 */
function getProgressBarColor(status: SLAStatus): string {
  switch (status) {
    case 'urgent':
      return 'bg-red-500'
    case 'warning':
      return 'bg-yellow-500'
    case 'on_track':
      return 'bg-green-500'
    case 'expired':
      return 'bg-gray-500'
    case 'no_deadline':
      return 'bg-blue-500'
    default:
      return 'bg-gray-500'
  }
}
