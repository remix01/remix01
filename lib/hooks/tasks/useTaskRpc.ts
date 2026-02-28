/**
 * Base RPC Hook
 * 
 * Low-level wrapper for Supabase RPC calls with error handling.
 * All other hooks use this as their foundation.
 */

'use client'

import { useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { RpcResponse, RpcError } from '@/lib/task-engine/types'

interface UseTaskRpcOptions {
  onSuccess?: (data: any) => void
  onError?: (error: RpcError) => void
}

/**
 * useTaskRpc - Base hook for making RPC calls to task engine functions
 * 
 * @param functionName - Name of the RPC function to call
 * @param options - Success/error callbacks
 * @returns Object with execute function and loading/error states
 */
export function useTaskRpc(functionName: string, options?: UseTaskRpcOptions) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<RpcError | null>(null)
  const [data, setData] = useState<any>(null)

  const execute = useCallback(
    async (params: Record<string, any>) => {
      setLoading(true)
      setError(null)
      setData(null)

      try {
        const supabase = createClient()
        if (!supabase) {
          throw {
            code: 'SUPABASE_ERROR',
            message: 'Supabase client not initialized',
          }
        }

        console.log(`[v0] Calling RPC: ${functionName}`, params)

        const { data: result, error: rpcError } = await supabase.rpc(
          functionName,
          params
        )

        if (rpcError) {
          console.error(`[v0] RPC error in ${functionName}:`, rpcError)
          const taskError: RpcError = {
            code: rpcError.code || 'RPC_ERROR',
            message: rpcError.message || 'RPC call failed',
            details: rpcError,
          }
          setError(taskError)
          options?.onError?.(taskError)
          throw taskError
        }

        console.log(`[v0] RPC success: ${functionName}`, result)

        // Extract result from response if it has success/data structure
        const resultData = result?.data || result
        setData(resultData)
        options?.onSuccess?.(resultData)

        return resultData
      } catch (err) {
        const taskError: RpcError = err instanceof Object && 'code' in err
          ? (err as RpcError)
          : {
              code: 'UNKNOWN_ERROR',
              message: err instanceof Error ? err.message : 'Unknown error',
            }

        setError(taskError)
        options?.onError?.(taskError)
        throw taskError
      } finally {
        setLoading(false)
      }
    },
    [functionName, options]
  )

  return {
    execute,
    loading,
    error,
    data,
    reset: () => {
      setLoading(false)
      setError(null)
      setData(null)
    },
  }
}

/**
 * useTaskRpcWithOptimisticUpdate - RPC hook with optimistic UI updates
 * 
 * Useful when you want to immediately update UI while RPC is in flight.
 * Falls back to original data if RPC fails.
 */
export function useTaskRpcWithOptimisticUpdate<T>(
  functionName: string,
  currentData: T,
  options?: UseTaskRpcOptions & { onOptimisticUpdate?: (data: T) => T }
) {
  const [optimisticData, setOptimisticData] = useState<T>(currentData)
  const { execute, ...rest } = useTaskRpc(functionName, {
    onSuccess: (data) => {
      setOptimisticData(data as T)
      options?.onSuccess?.(data)
    },
    onError: (error) => {
      // Revert to original data on error
      setOptimisticData(currentData)
      options?.onError?.(error)
    },
  })

  const executeWithOptimisticUpdate = useCallback(
    async (params: Record<string, any>, newData?: T) => {
      // Optimistically update UI
      if (newData) {
        setOptimisticData(newData)
      } else if (options?.onOptimisticUpdate) {
        setOptimisticData(options.onOptimisticUpdate(currentData))
      }

      // Then execute RPC
      try {
        return await execute(params)
      } catch (error) {
        // Revert on error is handled in onError callback
        throw error
      }
    },
    [execute, currentData, options]
  )

  return {
    execute: executeWithOptimisticUpdate,
    data: optimisticData,
    ...rest,
  }
}
