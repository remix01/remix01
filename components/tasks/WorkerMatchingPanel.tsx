/**
 * WorkerMatchingPanel Component (Example Template)
 * 
 * Demonstrates how to use the useMatchedTasks and useAssignTask hooks
 * to display ranked worker matches and enable assignment.
 * 
 * This is a template - customize styling and layout for your app.
 */

'use client'

import type React from 'react'
import { useState } from 'react'
import { useMatchedTasks, useAssignTask } from '@/lib/hooks/tasks'
import type { MatchedWorker } from '@/lib/task-engine/types'

interface WorkerMatchingPanelProps {
  taskId: string
  onAssignSuccess?: (workerId: string, assignmentId: string) => void
  onAssignError?: (error: Error) => void
  limit?: number
}

export function WorkerMatchingPanel({
  taskId,
  onAssignSuccess,
  onAssignError,
  limit = 5,
}: WorkerMatchingPanelProps) {
  const [selectedWorker, setSelectedWorker] = useState<MatchedWorker | null>(null)
  const [isAssigning, setIsAssigning] = useState(false)

  const { matchedWorkers, loading, error, totalQualified } = useMatchedTasks(
    taskId,
    {
      limit,
      autoLoad: true,
    }
  )

  const { assignTask, loading: assignLoading } = useAssignTask({
    onSuccess: (task, assignmentId) => {
      setIsAssigning(false)
      setSelectedWorker(null)
      onAssignSuccess?.(task.worker_id || '', assignmentId)
    },
    onError: (err) => {
      setIsAssigning(false)
      onAssignError?.(err)
    },
  })

  const handleAssign = async (worker: MatchedWorker) => {
    if (isAssigning || assignLoading) return

    try {
      setIsAssigning(true)
      setSelectedWorker(worker)
      await assignTask(taskId, worker.worker_id, false)
    } catch (err) {
      console.error('[v0] Error assigning task:', err)
      setIsAssigning(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header */}
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Matched Workers
        </h3>
        <p className="text-sm text-gray-600">
          {totalQualified} qualified workers found • Top {limit} matches shown
        </p>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="text-center py-8">
          <p className="text-gray-600">Loading matched workers...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200">
          <p className="text-sm text-red-600">
            Error loading matches: {error.message}
          </p>
        </div>
      )}

      {/* No Matches */}
      {!loading && !error && matchedWorkers.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-600">
            No qualified workers found for this task.
          </p>
        </div>
      )}

      {/* Worker List */}
      {!loading && matchedWorkers.length > 0 && (
        <div className="space-y-3">
          {matchedWorkers.map((worker, idx) => (
            <WorkerCard
              key={worker.worker_id}
              worker={worker}
              rank={idx + 1}
              isSelected={selectedWorker?.worker_id === worker.worker_id}
              isAssigning={isAssigning}
              onAssign={() => handleAssign(worker)}
            />
          ))}
        </div>
      )}

      {/* Bottom CTA for Auto-Assign */}
      {!loading && matchedWorkers.length > 0 && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <button
            onClick={() => {
              const topWorker = matchedWorkers[0]
              if (topWorker) handleAssign(topWorker)
            }}
            disabled={isAssigning || assignLoading}
            className="w-full py-2 px-4 rounded-lg font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isAssigning || assignLoading
              ? 'Assigning...'
              : 'Auto-Assign Top Match'}
          </button>
        </div>
      )}
    </div>
  )
}

/**
 * Individual worker card component
 */
function WorkerCard({
  worker,
  rank,
  isSelected,
  isAssigning,
  onAssign,
}: {
  key?: React.Key
  worker: MatchedWorker
  rank: number
  isSelected: boolean
  isAssigning: boolean
  onAssign: () => void | Promise<void>
}) {
  return (
    <div
      className={`p-3 rounded-lg border transition-all ${
        isSelected
          ? 'border-blue-500 bg-blue-50'
          : 'border-gray-200 bg-gray-50'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-blue-100 text-blue-700 text-xs font-semibold">
            #{rank}
          </span>
          <span className="font-medium text-gray-900">
            Worker {worker.worker_id.slice(0, 8)}
          </span>
        </div>
        <span className="text-xl font-bold text-blue-600">{worker.score}</span>
      </div>

      {/* Score Reasons */}
      {worker.reasons.length > 0 && (
        <div className="mb-3 space-y-1">
          {worker.reasons.map((reason, idx) => (
            <p key={idx} className="text-xs text-gray-600">
              ✓ {reason}
            </p>
          ))}
        </div>
      )}

      {/* Worker Stats */}
      {worker.stats && (
        <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">Rating</p>
            <p className="font-semibold text-gray-900">
              {worker.stats.avg_rating.toFixed(1)}/5.0
            </p>
          </div>
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">Completed</p>
            <p className="font-semibold text-gray-900">
              {worker.stats.total_completed} jobs
            </p>
          </div>
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">On-Time</p>
            <p className="font-semibold text-gray-900">
              {(worker.stats.on_time_rate * 100).toFixed(0)}%
            </p>
          </div>
          <div className="bg-white p-2 rounded">
            <p className="text-gray-600">Response</p>
            <p className="font-semibold text-gray-900">
              {worker.stats.response_time_minutes}min
            </p>
          </div>
        </div>
      )}

      {/* Assign Button */}
      <button
        onClick={onAssign}
        disabled={isAssigning}
        className="w-full py-2 px-3 rounded text-sm font-medium bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isAssigning && isSelected ? 'Assigning...' : 'Assign Worker'}
      </button>
    </div>
  )
}
