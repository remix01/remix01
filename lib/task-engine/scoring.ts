/**
 * Worker Scoring System
 * 
 * Calculates match scores for workers based on:
 * - Completion rate
 * - Customer ratings
 * - Response time
 * - On-time delivery rate
 * - Cancellation rate (penalty)
 */

import { SCORING_WEIGHTS, SCORING_THRESHOLDS } from '../task-engine/constants'
import type { WorkerStats, MatchScore } from '../task-engine/types'

/**
 * Calculate a single worker's match score (0-100)
 * 
 * Weights all factors and returns normalized 0-100 score
 */
export function calculateWorkerScore(stats: WorkerStats): number {
  // Check minimum requirements
  if (stats.total_completed < SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING) {
    return 0
  }

  if (stats.avg_rating < SCORING_THRESHOLDS.MIN_RATING) {
    return 0
  }

  // Calculate individual scores (each 0-100)
  const completionScore = calculateCompletionScore(stats.completion_rate)
  const ratingScore = calculateRatingScore(stats.avg_rating)
  const responseTimeScore = calculateResponseTimeScore(stats.response_time_minutes)
  const onTimeScore = calculateOnTimeScore(stats.on_time_rate)
  const cancellationPenalty = calculateCancellationPenalty(stats.cancellation_rate)

  // Weighted average
  let totalScore =
    (completionScore * SCORING_WEIGHTS.COMPLETION_RATE) / 100 +
    (ratingScore * SCORING_WEIGHTS.RATING) / 100 +
    (responseTimeScore * SCORING_WEIGHTS.RESPONSE_TIME) / 100 +
    (onTimeScore * SCORING_WEIGHTS.ON_TIME_RATE) / 100 +
    (cancellationPenalty * SCORING_WEIGHTS.CANCELLATION_RATE) / 100

  // Clamp to 0-100
  return Math.max(0, Math.min(100, totalScore))
}

/**
 * Completion rate: percentage of jobs completed vs total
 * 100% completion = 100 points
 */
function calculateCompletionScore(completionRate: number): number {
  // completionRate is 0-1, convert to 0-100
  return completionRate * 100
}

/**
 * Rating score: convert 1-5 star rating to 0-100
 * 5 stars = 100 points
 * 3 stars = 0 points (minimum acceptable)
 * Below 3 = worker is filtered out before this function
 */
function calculateRatingScore(avgRating: number): number {
  // Scale from 3-5 range to 0-100
  // Below 3 = 0, 3 = 0, 5 = 100
  const MIN_RATING = 3.0
  const MAX_RATING = 5.0

  if (avgRating < MIN_RATING) return 0
  if (avgRating >= MAX_RATING) return 100

  // Linear interpolation from 3-5 → 0-100
  return ((avgRating - MIN_RATING) / (MAX_RATING - MIN_RATING)) * 100
}

/**
 * Response time score: penalize slow responders
 * < 5 minutes = 100 points
 * 120 minutes (threshold) = 0 points
 * > 120 minutes = worker is filtered out
 */
function calculateResponseTimeScore(responseTimeMinutes: number): number {
  const FAST_THRESHOLD = 5
  const SLOW_THRESHOLD = SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES

  if (responseTimeMinutes <= FAST_THRESHOLD) return 100
  if (responseTimeMinutes >= SLOW_THRESHOLD) return 0

  // Linear penalty for slow response
  return 100 - ((responseTimeMinutes - FAST_THRESHOLD) / (SLOW_THRESHOLD - FAST_THRESHOLD)) * 100
}

/**
 * On-time rate: percentage of tasks completed by SLA deadline
 * 100% on-time = 100 points
 * Below threshold = warning but still usable
 */
function calculateOnTimeScore(onTimeRate: number): number {
  // onTimeRate is 0-1, convert to 0-100
  return onTimeRate * 100
}

/**
 * Cancellation penalty: penalize workers who cancel tasks
 * 0% cancellation = 100 points
 * 50% cancellation = 50 points
 * 100% cancellation = 0 points
 */
function calculateCancellationPenalty(cancellationRate: number): number {
  // cancellationRate is 0-1
  // Penalty: higher cancellation = lower score
  return (1 - cancellationRate) * 100
}

/**
 * Score multiple workers and return ranked list
 */
export function scoreWorkers(workerStats: WorkerStats[]): MatchScore[] {
  const scores = workerStats
    .map((stats) => ({
      worker_id: stats.worker_id,
      score: calculateWorkerScore(stats),
      stats,
    }))
    .filter((item) => item.score > 0) // Filter out zero scores
    .sort((a, b) => b.score - a.score) // Sort by score descending
    .map((item, rank) => ({
      worker_id: item.worker_id,
      score: Math.round(item.score),
      reasons: generateScoreReasons(item.stats, item.score),
      match_rank: rank + 1,
    }))

  return scores
}

/**
 * Generate human-readable reasons for a worker's score
 */
function generateScoreReasons(stats: WorkerStats, score: number): string[] {
  const reasons: string[] = []

  if (stats.total_completed < SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING) {
    reasons.push(`Low experience (${stats.total_completed} jobs)`)
  }

  if (stats.avg_rating >= 4.5) {
    reasons.push(`Excellent rating (${stats.avg_rating.toFixed(1)} stars)`)
  } else if (stats.avg_rating >= 4.0) {
    reasons.push(`Good rating (${stats.avg_rating.toFixed(1)} stars)`)
  }

  if (stats.response_time_minutes < 30) {
    reasons.push('Fast responder')
  }

  if (stats.on_time_rate >= 0.9) {
    reasons.push('Reliable on-time delivery')
  }

  if (stats.cancellation_rate < 0.05) {
    reasons.push('Low cancellation rate')
  } else if (stats.cancellation_rate > 0.2) {
    reasons.push(`Higher cancellation rate (${(stats.cancellation_rate * 100).toFixed(0)}%)`)
  }

  if (reasons.length === 0) {
    reasons.push(`Overall score: ${Math.round(score)}/100`)
  }

  return reasons
}

/**
 * Check if a worker meets minimum requirements
 */
export function isWorkerQualified(stats: WorkerStats): boolean {
  return (
    stats.total_completed >= SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING &&
    stats.avg_rating >= SCORING_THRESHOLDS.MIN_RATING &&
    stats.response_time_minutes <= SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES
  )
}

/**
 * Get performance summary for a worker
 */
export function getWorkerPerformanceSummary(stats: WorkerStats) {
  return {
    completionRate: `${(stats.completion_rate * 100).toFixed(0)}%`,
    rating: `${stats.avg_rating.toFixed(1)}/5.0`,
    responseTime: `${stats.response_time_minutes} min`,
    onTimeRate: `${(stats.on_time_rate * 100).toFixed(0)}%`,
    cancellationRate: `${(stats.cancellation_rate * 100).toFixed(0)}%`,
    totalCompleted: stats.total_completed,
    isQualified: isWorkerQualified(stats),
  }
}
