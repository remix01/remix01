/**
 * Worker Matching Utilities
 * 
 * Helper functions for filtering and matching workers based on location,
 * qualifications, and preferences.
 */

import type { WorkerStats, Task, MatchScore } from './types'
import { MATCHING_RULES, SCORING_THRESHOLDS } from './constants'
import { calculateWorkerScore } from './scoring'

/**
 * Calculate distance between two coordinates (Haversine formula)
 * Returns distance in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371 // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Parse location string to coordinates (basic implementation)
 * 
 * In production, use a proper geocoding service (Google Maps API, etc.)
 * This is a placeholder that returns approximate coordinates
 */
export function parseLocation(location: string): { lat: number; lon: number } | null {
  // Parse "lat,lon" format
  const match = location.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/)
  if (match) {
    return {
      lat: parseFloat(match[1]),
      lon: parseFloat(match[2]),
    }
  }

  // In a real implementation, you would:
  // 1. Call a geocoding service (Google Maps, Mapbox, etc.)
  // 2. Cache the results
  // 3. Return precise coordinates

  // For now, return null and rely on backend to provide coordinates
  return null
}

/**
 * Filter workers by location radius
 * 
 * @param workers - List of workers with stats
 * @param taskLocation - Task location string or coordinates
 * @param radiusKm - Search radius in kilometers
 * @returns Workers within radius, sorted by distance
 */
export function filterWorkersByLocation(
  workers: WorkerStats[],
  taskLocation: string,
  radiusKm: number = MATCHING_RULES.CONSIDER_WITHIN_RADIUS_KM
): WorkerStats[] {
  const taskCoords = parseLocation(taskLocation)

  // If we can't parse location, return all workers
  if (!taskCoords) {
    return workers
  }

  // In a real implementation, workers would have location data
  // For now, this is a placeholder
  return workers
}

/**
 * Filter workers by category match
 */
export function filterWorkersByCategory(
  workers: WorkerStats[],
  taskCategory: string
): WorkerStats[] {
  // In production, add a category field to WorkerStats
  // For now, return all workers
  return workers
}

/**
 * Filter workers by minimum rating
 */
export function filterWorkersByRating(
  workers: WorkerStats[],
  minRating: number = SCORING_THRESHOLDS.MIN_RATING
): WorkerStats[] {
  return workers.filter(worker => worker.avg_rating >= minRating)
}

/**
 * Filter workers by minimum completion count
 */
export function filterWorkersByExperience(
  workers: WorkerStats[],
  minJobs: number = SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING
): WorkerStats[] {
  return workers.filter(worker => worker.total_completed >= minJobs)
}

/**
 * Filter workers by response time
 */
export function filterWorkersByResponseTime(
  workers: WorkerStats[],
  maxMinutes: number = SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES
): WorkerStats[] {
  return workers.filter(worker => worker.response_time_minutes <= maxMinutes)
}

/**
 * Filter workers by on-time rate
 */
export function filterWorkersByOnTimeRate(
  workers: WorkerStats[],
  minRate: number = SCORING_THRESHOLDS.MIN_ON_TIME_RATE
): WorkerStats[] {
  return workers.filter(worker => worker.on_time_rate >= minRate)
}

/**
 * Filter workers by cancellation rate
 */
export function filterWorkersByCancellationRate(
  workers: WorkerStats[],
  maxRate: number = 0.2 // 20% max cancellations
): WorkerStats[] {
  return workers.filter(worker => worker.cancellation_rate <= maxRate)
}

/**
 * Apply comprehensive filtering for task matching
 */
export function filterQualifiedWorkers(
  workers: WorkerStats[],
  options?: {
    minRating?: number
    minExperience?: number
    maxResponseTime?: number
    minOnTimeRate?: number
    maxCancellationRate?: number
  }
): WorkerStats[] {
  let filtered = workers

  filtered = filterWorkersByRating(filtered, options?.minRating)
  filtered = filterWorkersByExperience(filtered, options?.minExperience)
  filtered = filterWorkersByResponseTime(filtered, options?.maxResponseTime)
  filtered = filterWorkersByOnTimeRate(filtered, options?.minOnTimeRate)
  filtered = filterWorkersByCancellationRate(filtered, options?.maxCancellationRate)

  return filtered
}

/**
 * Generate match score explanations
 */
export function generateMatchExplanation(
  score: number,
  stats: WorkerStats
): string[] {
  const explanations: string[] = []

  if (score >= 90) {
    explanations.push('Excellent match for this task')
  } else if (score >= 75) {
    explanations.push('Good match for this task')
  } else if (score >= 60) {
    explanations.push('Acceptable match for this task')
  } else {
    explanations.push('Limited match for this task')
  }

  if (stats.total_completed >= 100) {
    explanations.push('Highly experienced worker')
  } else if (stats.total_completed >= 50) {
    explanations.push('Experienced worker')
  } else if (stats.total_completed >= 5) {
    explanations.push('Some experience')
  }

  if (stats.avg_rating >= 4.8) {
    explanations.push('Exceptional ratings')
  } else if (stats.avg_rating >= 4.5) {
    explanations.push('Excellent ratings')
  } else if (stats.avg_rating >= 4.0) {
    explanations.push('Good ratings')
  }

  return explanations
}

/**
 * Sort workers by score and return top matches
 */
export function getTopMatches(
  scores: MatchScore[],
  limit: number = MATCHING_RULES.TOP_MATCHES_COUNT
): MatchScore[] {
  return scores.slice(0, limit)
}

/**
 * Check if a worker is already claimed for a task
 * (In production, check against claims/assignments table)
 */
export function isWorkerAlreadyClaimed(workerId: string, taskId: string): boolean {
  // This would check the assignments/claims table in production
  return false
}

/**
 * Calculate score adjustment for worker availability
 * (In production, check worker availability calendar)
 */
export function calculateAvailabilityBonus(workerId: string, taskDate: Date): number {
  // Return 0-10 point bonus based on availability
  // In production, check worker's calendar
  return 0
}

/**
 * Check if worker meets minimum requirements for task assignment
 */
export function canAssignWorker(stats: WorkerStats): boolean {
  return (
    stats.total_completed >= SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING &&
    stats.avg_rating >= SCORING_THRESHOLDS.MIN_RATING &&
    stats.response_time_minutes <= SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES
  )
}

/**
 * Get match explanation for failed qualification
 */
export function getDisqualificationReason(stats: WorkerStats): string {
  if (stats.total_completed < SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING) {
    return `Insufficient experience (${stats.total_completed}/${SCORING_THRESHOLDS.MIN_JOBS_FOR_RANKING} jobs)`
  }

  if (stats.avg_rating < SCORING_THRESHOLDS.MIN_RATING) {
    return `Rating too low (${stats.avg_rating.toFixed(1)}/${SCORING_THRESHOLDS.MIN_RATING} stars)`
  }

  if (stats.response_time_minutes > SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES) {
    return `Response time too slow (${stats.response_time_minutes}/${SCORING_THRESHOLDS.MAX_RESPONSE_TIME_MINUTES} minutes)`
  }

  return 'Does not meet requirements'
}

/**
 * Rank workers for a specific task
 */
export function rankWorkersForTask(
  scores: MatchScore[],
  options?: {
    limit?: number
    minScore?: number
  }
): MatchScore[] {
  let ranked = scores

  if (options?.minScore !== undefined) {
    ranked = ranked.filter(score => score.score >= options.minScore!)
  }

  if (options?.limit) {
    ranked = ranked.slice(0, options.limit)
  }

  return ranked
}

/**
 * Get match statistics
 */
export function getMatchStatistics(scores: MatchScore[]) {
  const validScores = scores.filter(s => s.score > 0)

  if (validScores.length === 0) {
    return {
      totalMatches: 0,
      averageScore: 0,
      topScore: 0,
      minScore: 0,
    }
  }

  const scoreValues = validScores.map(s => s.score)

  return {
    totalMatches: validScores.length,
    averageScore: Math.round(scoreValues.reduce((a, b) => a + b, 0) / scoreValues.length),
    topScore: Math.max(...scoreValues),
    minScore: Math.min(...scoreValues),
  }
}
