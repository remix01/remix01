/**
 * SLA Utility Functions
 * 
 * Helper functions for calculating SLA time remaining, checking warnings,
 * and formatting SLA-related information.
 */

import type { Task, TaskPriority } from './types'
import { SLA_DEFAULTS, NOTIFICATION_CONFIG } from './constants'

/**
 * Calculate time remaining until SLA deadline
 * 
 * @param slaDeadline - ISO string of SLA deadline
 * @returns Object with remaining time in various formats
 */
export function calculateTimeRemaining(slaDeadline: string | null) {
  if (!slaDeadline) {
    return {
      milliseconds: null,
      seconds: null,
      minutes: null,
      hours: null,
      days: null,
      isExpired: true,
      formattedTime: 'No deadline',
    }
  }

  const deadline = new Date(slaDeadline)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()

  if (diffMs <= 0) {
    return {
      milliseconds: 0,
      seconds: 0,
      minutes: 0,
      hours: 0,
      days: 0,
      isExpired: true,
      formattedTime: 'Expired',
    }
  }

  const seconds = Math.floor(diffMs / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  let formattedTime = ''
  if (days > 0) {
    formattedTime = `${days}d ${hours % 24}h remaining`
  } else if (hours > 0) {
    formattedTime = `${hours}h ${minutes % 60}m remaining`
  } else if (minutes > 0) {
    formattedTime = `${minutes}m remaining`
  } else {
    formattedTime = `${seconds}s remaining`
  }

  return {
    milliseconds: diffMs,
    seconds,
    minutes,
    hours,
    days,
    isExpired: false,
    formattedTime,
  }
}

/**
 * Check if a task is approaching SLA deadline (warning threshold)
 * 
 * Default warning threshold is 1 hour before expiry
 */
export function isSLAWarning(
  slaDeadline: string | null,
  warningThresholdHours: number = NOTIFICATION_CONFIG.SEND_EXPIRY_WARNING_HOURS
): boolean {
  if (!slaDeadline) return false

  const timeRemaining = calculateTimeRemaining(slaDeadline)
  if (timeRemaining.isExpired) return false

  return timeRemaining.hours <= warningThresholdHours
}

/**
 * Check if a task has passed its SLA deadline
 */
export function isSLAExpired(slaDeadline: string | null): boolean {
  if (!slaDeadline) return false
  const timeRemaining = calculateTimeRemaining(slaDeadline)
  return timeRemaining.isExpired
}

/**
 * Get SLA status summary for a task
 */
export function getSLAStatus(task: Task): 'urgent' | 'warning' | 'on_track' | 'expired' | 'no_deadline' {
  if (!task.sla_deadline) {
    return 'no_deadline'
  }

  if (isSLAExpired(task.sla_deadline)) {
    return 'expired'
  }

  const timeRemaining = calculateTimeRemaining(task.sla_deadline)

  // Urgent if less than 1 hour remaining
  if (timeRemaining.hours < 1) {
    return 'urgent'
  }

  // Warning if less than configured threshold
  if (isSLAWarning(task.sla_deadline)) {
    return 'warning'
  }

  return 'on_track'
}

/**
 * Get SLA deadline for a task based on priority and publish time
 */
export function calculateSLADeadline(
  publishTime: string | Date,
  priority: TaskPriority
): string {
  const slaHours = SLA_DEFAULTS[priority.toUpperCase() as Uppercase<TaskPriority>] || SLA_DEFAULTS.MEDIUM
  const deadline = new Date(publishTime)
  deadline.setHours(deadline.getHours() + slaHours)
  return deadline.toISOString()
}

/**
 * Get human-readable SLA deadline description
 */
export function formatSLADeadline(slaDeadline: string | null): string {
  if (!slaDeadline) {
    return 'No deadline'
  }

  const deadline = new Date(slaDeadline)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()

  // If in the past, show as expired
  if (diffMs <= 0) {
    return 'Expired'
  }

  // Today
  if (deadline.toDateString() === now.toDateString()) {
    const hours = Math.floor(diffMs / (1000 * 60 * 60))
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
    if (hours === 0) {
      return `${minutes}m left`
    }
    return `${hours}h ${minutes}m left`
  }

  // Tomorrow or later
  const daysFromNow = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  const timeStr = deadline.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  const dateStr = deadline.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  return `${dateStr} at ${timeStr}`
}

/**
 * Estimate SLA hours based on priority
 */
export function estimateSLAHours(priority: TaskPriority): number {
  return SLA_DEFAULTS[priority.toUpperCase() as Uppercase<TaskPriority>] || SLA_DEFAULTS.MEDIUM
}

/**
 * Get percentage of SLA time used
 */
export function calculateSLAUsagePercentage(task: Task, publishTime?: string | Date): number {
  if (!task.sla_deadline) return 0

  const deadline = new Date(task.sla_deadline)
  const now = new Date()
  const diffMs = deadline.getTime() - now.getTime()

  // If expired
  if (diffMs <= 0) return 100

  // If not published yet, return 0
  if (!task.created_at) return 0

  const publishDate = publishTime ? new Date(publishTime) : new Date(task.created_at)
  const totalMs = deadline.getTime() - publishDate.getTime()

  if (totalMs <= 0) return 100

  const used = totalMs - diffMs
  return Math.round((used / totalMs) * 100)
}

/**
 * Get color for SLA status (for UI purposes)
 */
export function getSLAStatusColor(status: ReturnType<typeof getSLAStatus>): string {
  switch (status) {
    case 'urgent':
      return 'red'
    case 'warning':
      return 'amber'
    case 'on_track':
      return 'green'
    case 'expired':
      return 'gray'
    case 'no_deadline':
      return 'blue'
    default:
      return 'gray'
  }
}

/**
 * Check if task should be auto-expired based on visibility rules
 */
export function shouldAutoExpire(task: Task): boolean {
  // Only auto-expire if task is in claimed or accepted state
  if (!['claimed', 'accepted'].includes(task.status)) {
    return false
  }

  if (!task.sla_deadline) {
    return false
  }

  return isSLAExpired(task.sla_deadline)
}

/**
 * Batch check multiple tasks for SLA status
 */
export function batchGetSLAStatus(tasks: Task[]): Record<string, ReturnType<typeof getSLAStatus>> {
  const statusMap: Record<string, ReturnType<typeof getSLAStatus>> = {}

  for (const task of tasks) {
    statusMap[task.id] = getSLAStatus(task)
  }

  return statusMap
}

/**
 * Get tasks that are approaching SLA expiry
 */
export function filterTasksByApproachingSLA(
  tasks: Task[],
  thresholdHours: number = NOTIFICATION_CONFIG.SEND_EXPIRY_WARNING_HOURS
): Task[] {
  return tasks.filter(task => isSLAWarning(task.sla_deadline, thresholdHours))
}

/**
 * Get tasks that have expired SLA
 */
export function filterExpiredTasks(tasks: Task[]): Task[] {
  return tasks.filter(task => isSLAExpired(task.sla_deadline))
}
