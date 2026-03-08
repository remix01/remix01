/**
 * Task Engine Constants
 * 
 * SLA thresholds, scoring weights, and configuration values.
 * Update these to match your business rules.
 */

// SLA Configuration (in hours)
export const SLA_DEFAULTS = {
  LOW: 48,      // Low priority tasks expire in 48 hours
  MEDIUM: 24,   // Medium priority tasks expire in 24 hours
  HIGH: 12,     // High priority tasks expire in 12 hours
  URGENT: 4,    // Urgent tasks expire in 4 hours
} as const

// Worker scoring weights (must sum to 100)
export const SCORING_WEIGHTS = {
  COMPLETION_RATE: 30,    // 30% - completed jobs / total jobs
  RATING: 25,              // 25% - average customer rating (1-5 stars)
  RESPONSE_TIME: 20,       // 20% - how quickly worker responds
  ON_TIME_RATE: 15,        // 15% - completed jobs on or before SLA
  CANCELLATION_RATE: 10,   // 10% - penalty for cancellations (negative weight)
} as const

// Threshold values for scoring
export const SCORING_THRESHOLDS = {
  MIN_JOBS_FOR_RANKING: 5,       // Worker needs 5+ jobs to be ranked
  MIN_RATING: 3.0,               // Minimum 3-star rating to claim tasks
  MAX_RESPONSE_TIME_MINUTES: 120, // Flag if response takes >2 hours
  MIN_ON_TIME_RATE: 0.7,         // Warn if on-time rate drops below 70%
} as const

// Task visibility rules
export const VISIBILITY_RULES = {
  PUBLISHED_TO_WORKERS_DELAY_SECONDS: 30, // Delay before task visible to workers
  AUTO_EXPIRE_CLAIMED_AFTER_HOURS: 2,    // Unclaimed tasks expire after 2 hours
  AUTO_EXPIRE_ACCEPTED_AFTER_HOURS: 24,  // Accepted tasks expire after 24 hours
  SHOW_COMPLETED_AFTER_DAYS: 7,          // Show completed tasks for 7 days
} as const

// Notification configuration
export const NOTIFICATION_CONFIG = {
  SEND_CLAIM_NOTIFICATION: true,
  SEND_EXPIRY_WARNING_HOURS: 1,
  SEND_COMPLETION_NOTIFICATION: true,
  SEND_CANCELLATION_NOTIFICATION: true,
} as const

// Worker matching rules
export const MATCHING_RULES = {
  CONSIDER_WITHIN_RADIUS_KM: 10,      // Only match workers within 10km
  TOP_MATCHES_COUNT: 5,               // Show top 5 matches
  FILTER_BY_CATEGORY_MATCH: true,    // Only match same category workers
  CONSIDER_HISTORICAL_RATING: true,  // Weight past ratings
  REQUIRE_VERIFIED_BADGE: false,     // Don't require verification
} as const

// Error codes
export const ERROR_CODES = {
  INVALID_TASK_ID: 'TASK_001',
  INVALID_TRANSITION: 'TASK_002',
  TASK_NOT_FOUND: 'TASK_003',
  INVALID_WORKER: 'TASK_004',
  PERMISSION_DENIED: 'TASK_005',
  SLA_EXPIRED: 'TASK_006',
  WORKER_ALREADY_CLAIMED: 'TASK_007',
  TASK_LOCKED: 'TASK_008',
} as const

// Message templates
export const MESSAGES = {
  PUBLISH_SUCCESS: 'Task published successfully',
  CLAIM_SUCCESS: 'Task claimed. You have {{ sla_hours }} hours to complete.',
  ACCEPT_SUCCESS: 'Task accepted. Worker is on the way.',
  START_SUCCESS: 'Work started. Customer has been notified.',
  COMPLETE_SUCCESS: 'Task marked as complete. Awaiting customer review.',
  CANCEL_SUCCESS: 'Task cancelled.',
  PUBLISH_FAILED: 'Failed to publish task: {{ reason }}',
  INVALID_TRANSITION: 'Cannot transition from {{ from }} to {{ to }}',
} as const
