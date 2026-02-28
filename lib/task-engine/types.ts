/**
 * Task Engine Type Definitions
 * 
 * All types for tasks, audit logs, scoring, and RPC operations.
 * Ensure these match the backend database schema exactly.
 */

// Task Status Workflow (State Machine)
export type TaskStatus = 
  | 'pending'      // Newly created, waiting for publication
  | 'published'    // Live, available for claims
  | 'claimed'      // Claimed by worker, waiting for acceptance
  | 'accepted'     // Accepted, worker is on the way
  | 'in_progress'  // Work started
  | 'completed'    // Work finished, awaiting customer review
  | 'expired'      // SLA deadline passed without completion
  | 'cancelled'    // Cancelled by customer or admin

// Valid state transitions (enforced by State Machine Guard)
export const TASK_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  pending: ['published', 'cancelled'],
  published: ['claimed', 'cancelled'],
  claimed: ['accepted', 'published', 'cancelled'],
  accepted: ['in_progress', 'claimed', 'cancelled'],
  in_progress: ['completed', 'cancelled'],
  completed: ['expired', 'cancelled'],
  expired: [],
  cancelled: [],
}

// Worker role for task assignment
export type WorkerRole = 
  | 'plumber'
  | 'electrician'
  | 'carpenter'
  | 'cleaner'
  | 'painter'
  | 'landscaper'
  | 'general'

// Priority levels affect SLA and visibility
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent'

export interface Task {
  id: string
  customer_id: string
  worker_id: string | null
  title: string
  description: string
  category: WorkerRole
  status: TaskStatus
  priority: TaskPriority
  location: string
  estimated_value: number | null
  sla_deadline: string | null
  claimed_at: string | null
  started_at: string | null
  completed_at: string | null
  expired_at: string | null
  cancelled_at: string | null
  created_at: string
  updated_at: string
}

// Audit log entry for all task changes
export interface AuditLog {
  id: string
  table_name: 'tasks'
  record_id: string
  action: 'INSERT' | 'UPDATE' | 'DELETE'
  old_data: Record<string, any> | null
  new_data: Record<string, any> | null
  changed_by: string | null
  changed_at: string
}

// Task event from realtime subscription
export interface TaskEvent {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE'
  schema: string
  table: string
  commit_timestamp: string
  record: Task
  previous?: Task
}

// RPC function signatures
export interface PublishTaskParams {
  task_id: string
  sla_hours: number
}

export interface PublishTaskResult {
  success: boolean
  task: Task
  message: string
}

export interface ClaimTaskParams {
  task_id: string
  worker_id: string
}

export interface ClaimTaskResult {
  success: boolean
  task: Task
  message: string
}

export interface AcceptTaskParams {
  task_id: string
}

export interface AcceptTaskResult {
  success: boolean
  task: Task
  message: string
}

export interface StartTaskParams {
  task_id: string
}

export interface StartTaskResult {
  success: boolean
  task: Task
  message: string
}

export interface CompleteTaskParams {
  task_id: string
  notes?: string
}

export interface CompleteTaskResult {
  success: boolean
  task: Task
  message: string
}

export interface CancelTaskParams {
  task_id: string
  reason: string
}

export interface CancelTaskResult {
  success: boolean
  task: Task
  message: string
}

// Worker matching and scoring
export interface WorkerStats {
  id: string
  worker_id: string
  total_completed: number
  avg_rating: number
  response_time_minutes: number
  completion_rate: number // 0-1
  cancellation_rate: number // 0-1
  on_time_rate: number // 0-1
  updated_at: string
}

export interface MatchScore {
  worker_id: string
  score: number // 0-100
  reasons: string[]
  match_rank: number
}

// Filter types for task queries
export type TaskFilterType = 'my_tasks' | 'available' | 'overdue' | 'completed' | 'all'

export interface TaskFilter {
  type: TaskFilterType
  status?: TaskStatus[]
  priority?: TaskPriority[]
  category?: WorkerRole[]
  user_id?: string
  limit?: number
  offset?: number
}

// Query result with pagination
export interface TaskQueryResult {
  tasks: Task[]
  total_count: number
  has_more: boolean
}

// Error responses from RPC functions
export interface RpcError {
  code: string
  message: string
  details?: Record<string, any>
}

export interface RpcResponse<T> {
  success: boolean
  data?: T
  error?: RpcError
}
