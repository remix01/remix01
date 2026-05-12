'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface ErrorMessage {
  id: string
  message: string
  timestamp: number
}

export function GlobalErrorHandler() {
  const [errors, setErrors] = useState<ErrorMessage[]>([])

  useEffect(() => {

    const isRecoverableChunkLoadError = (message: string) => {
      const normalized = message.toLowerCase()
      return (
        normalized.includes('load failed') ||
        normalized.includes('chunkloaderror') ||
        normalized.includes('loading chunk') ||
        normalized.includes('failed to fetch dynamically imported module')
      )
    }

    const attemptChunkRecovery = () => {
      if (typeof window === 'undefined') return false
      const recoveryKey = '__chunk_load_retry_once__'
      if (window.sessionStorage.getItem(recoveryKey) === '1') return false
      window.sessionStorage.setItem(recoveryKey, '1')
      window.location.reload()
      return true
    }
    // Catch unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = event.reason?.message || String(event.reason) || 'Unknown error'

      if (isRecoverableChunkLoadError(message)) {
        event.preventDefault()
        if (attemptChunkRecovery()) return
      }
      addError(message)
      console.error('[GlobalErrorHandler] Unhandled rejection:', event.reason)
      
      // Log device info for debugging mobile issues
      if (typeof window !== 'undefined') {
        console.log('[v0] Device info:', {
          userAgent: navigator.userAgent,
          mobile: /Mobile|Android|iPhone/i.test(navigator.userAgent),
          viewport: { width: window.innerWidth, height: window.innerHeight },
          memory: (navigator as any).deviceMemory,
        })
      }
    }

    // Catch global errors
    const handleError = (event: ErrorEvent) => {
      if (isRecoverableChunkLoadError(event.message || '')) {
        event.preventDefault()
        if (attemptChunkRecovery()) return
      }

      addError(event.message)
      console.error('[GlobalErrorHandler] Global error:', event.error)
      
      // Log stack trace for hydration mismatches
      if (event.message?.includes('Hydration failed') || event.message?.includes('mismatch')) {
        console.error('[v0] HYDRATION MISMATCH DETECTED:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack,
        })
      }
    }

    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    window.addEventListener('error', handleError)

    // Also hook into console.error to catch logged errors
    const originalConsoleError = console.error
    console.error = function(...args: any[]) {
      const message = args
        .map(arg => {
          if (typeof arg === 'string') return arg
          if (arg instanceof Error) return arg.message
          try {
            return JSON.stringify(arg)
          } catch {
            return String(arg)
          }
        })
        .join(' ')

      // Only capture critical errors (those with [v0] prefix or specific keywords)
      if (
        message.includes('[v0]') ||
        message.includes('Cannot read') ||
        message.includes('is not defined') ||
        message.includes('Module not found') ||
        message.includes('localStorage') ||
        message.includes('undefined')
      ) {
        addError(message)
      }

      originalConsoleError.apply(console, args)
    }

    return () => {
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
      window.removeEventListener('error', handleError)
      console.error = originalConsoleError
    }
  }, [])

  const addError = (message: string) => {
    const id = Date.now().toString()
    setErrors(prev => {
      // Deduplicate similar errors
      if (prev.some(e => e.message === message)) return prev
      return [{ id, message, timestamp: Date.now() }, ...prev].slice(0, 5)
    })

    // Auto-remove after 8 seconds
    setTimeout(() => {
      removeError(id)
    }, 8000)
  }

  const removeError = (id: string) => {
    setErrors(prev => prev.filter(e => e.id !== id))
  }

  if (errors.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 max-w-md space-y-2 pointer-events-none">
      {errors.map(error => (
        <div
          key={error.id}
          className="bg-red-500 text-white rounded-lg shadow-lg p-4 flex items-start gap-3 animate-in slide-in-from-top-2 pointer-events-auto"
        >
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-tight line-clamp-2">
              {/* Strip [v0] prefix for cleaner display */}
              {error.message.replace(/^\[v0\]\s*/, '')}
            </p>
          </div>
          <button
            onClick={() => removeError(error.id)}
            className="flex-shrink-0 text-white/80 hover:text-white transition-colors"
            aria-label="Close error"
          >
            <X size={18} />
          </button>
        </div>
      ))}
    </div>
  )
}
