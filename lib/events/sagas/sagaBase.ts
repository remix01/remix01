/**
 * Saga Base Class — Abstract orchestrator for multi-step transactions
 * 
 * Implements the Saga pattern: a sequence of steps where each step has a
 * compensating action (rollback). If any step fails, compensation executes
 * in reverse order to maintain consistency across service boundaries.
 */

import { createAdminClient } from '@/lib/supabase/server'

export interface SagaStep<TContext> {
  name: string
  execute: (ctx: TContext) => Promise<TContext>
  compensate: (ctx: TContext) => Promise<void>
}

export interface SagaInstanceRecord {
  id: string
  saga_type: string
  task_id: string
  current_step: number
  status: 'running' | 'completed' | 'compensating' | 'failed'
  completed_steps: Array<{ step_index: number; step_name: string; completedAt: string }>
  compensation_log: Array<{ step_index: number; success: boolean; error?: string }>
  error_message: string | null
  created_at: string
  updated_at: string
}

export abstract class SagaBase<TContext extends { taskId: string }> {
  abstract sagaType: string
  abstract steps: SagaStep<TContext>[]

  /**
   * Execute saga: run all steps in sequence, compensate on failure
   */
  async execute(initialCtx: TContext): Promise<TContext> {
    const supabase = createAdminClient()
    const completedSteps: number[] = []
    let ctx = initialCtx

    // Create saga instance
    const { data: instance, error: createError } = await supabase
      .from('saga_instances')
      .insert({
        saga_type: this.sagaType,
        task_id: ctx.taskId,
        status: 'running',
      })
      .select()
      .single()

    if (createError || !instance) {
      throw new Error(`[Saga] Failed to create instance: ${createError?.message}`)
    }

    try {
      // Execute all steps in sequence
      for (let i = 0; i < this.steps.length; i++) {
        const step = this.steps[i]
        console.log(`[Saga ${this.sagaType}] Executing step ${i}: ${step.name}`)

        ctx = await step.execute(ctx)
        completedSteps.push(i)

        // Update saga progress
        await supabase
          .from('saga_instances')
          .update({
            current_step: i + 1,
            completed_steps: completedSteps.map(stepIdx => ({
              step_index: stepIdx,
              step_name: this.steps[stepIdx].name,
              completedAt: new Date().toISOString(),
            })),
            updated_at: new Date().toISOString(),
          })
          .eq('id', instance.id)
      }

      // All steps completed successfully
      await supabase
        .from('saga_instances')
        .update({
          status: 'completed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      console.log(`[Saga ${this.sagaType}] Completed for task ${ctx.taskId}`)
      return ctx

    } catch (error) {
      // Compensation: rollback completed steps in reverse order
      console.error(`[Saga ${this.sagaType}] Error at step, starting compensation:`, error)

      await supabase
        .from('saga_instances')
        .update({
          status: 'compensating',
          error_message: String(error),
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      const compensationLog: Array<{ step_index: number; success: boolean; error?: string }> = []

      // Compensate in reverse order
      for (const stepIdx of [...completedSteps].reverse()) {
        const step = this.steps[stepIdx]
        console.log(`[Saga ${this.sagaType}] Compensating step ${stepIdx}: ${step.name}`)

        try {
          await step.compensate(ctx)
          compensationLog.push({ step_index: stepIdx, success: true })
        } catch (compErr) {
          console.error(`[Saga ${this.sagaType}] Compensation failed at step ${stepIdx}:`, compErr)
          compensationLog.push({
            step_index: stepIdx,
            success: false,
            error: String(compErr),
          })
        }
      }

      // Mark saga as failed
      await supabase
        .from('saga_instances')
        .update({
          status: 'failed',
          compensation_log: compensationLog,
          updated_at: new Date().toISOString(),
        })
        .eq('id', instance.id)

      throw error
    }
  }
}
