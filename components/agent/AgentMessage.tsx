'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import { ChatMessage } from './useAgentChat'

type AgentMessageProps = {
  message: ChatMessage
  onRetry?: () => void
}

export function AgentMessage({ message, onRetry }: AgentMessageProps) {
  const isAgent = message.role === 'agent'
  const isError = message.status === 'error'

  const timeAgo = React.useMemo(() => {
    const now = Date.now()
    const diff = Math.floor((now - message.timestamp) / 1000)

    if (diff < 60) return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return new Date(message.timestamp).toLocaleDateString()
  }, [message.timestamp])

  return (
    <div
      className={`flex gap-3 ${isAgent ? 'justify-start' : 'justify-end'}`}
      title={timeAgo}
    >
      {isAgent && (
        <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          LA
        </div>
      )}

      <div
        className={`flex-1 max-w-xs px-4 py-2 rounded-lg ${
          isAgent
            ? isError
              ? 'bg-red-100 border border-red-300 text-red-900'
              : 'bg-slate-700 text-white'
            : 'bg-blue-600 text-white'
        }`}
      >
        {isAgent && !isError ? (
          <div className="prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
              components={{
                p: ({ node, ...props }) => <p className="mb-1" {...props} />,
                ul: ({ node, ...props }) => (
                  <ul className="list-disc list-inside mb-1" {...props} />
                ),
                ol: ({ node, ...props }) => (
                  <ol className="list-decimal list-inside mb-1" {...props} />
                ),
                code: ({ inline, ...props }) =>
                  inline ? (
                    <code
                      className="bg-slate-800 px-1 py-0.5 rounded text-xs"
                      {...props}
                    />
                  ) : (
                    <code
                      className="block bg-slate-800 p-2 rounded text-xs mb-1 overflow-x-auto"
                      {...props}
                    />
                  ),
                strong: ({ node, ...props }) => <strong className="font-bold" {...props} />,
                em: ({ node, ...props }) => <em className="italic" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-sm">{message.content}</p>
        )}

        {isAgent && message.toolUsed && (
          <div className="text-xs mt-2 opacity-75 border-t border-opacity-30 border-current pt-1">
            used: {message.toolUsed}
          </div>
        )}

        {isError && onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  )
}
