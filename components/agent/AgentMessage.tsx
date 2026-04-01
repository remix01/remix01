'use client'

import React, { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Copy, Check, RotateCcw } from 'lucide-react'
import { ChatMessage } from './useAgentChat'

type AgentMessageProps = {
  key?: React.Key
  message: ChatMessage
  onRetry?: () => void
}

export function AgentMessage({ message, onRetry }: AgentMessageProps) {
  const isAgent = message.role === 'agent'
  const isError = message.status === 'error'
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (!isAgent) {
    // User message — right-aligned bubble
    return (
      <div className="flex justify-end px-4 py-1">
        <div
          className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isError
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-[#f0f4ff] text-slate-900'
          }`}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>
          {isError && onRetry && (
            <button
              onClick={onRetry}
              className="mt-2 flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
            >
              <RotateCcw className="w-3 h-3" />
              Poskusi znova
            </button>
          )}
        </div>
      </div>
    )
  }

  // Agent message — full width, no bubble, like Claude
  return (
    <div className="group px-4 py-3 hover:bg-slate-50/70 transition-colors">
      <div className="flex gap-3">
        {/* Avatar */}
        <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gradient-to-br from-orange-400 to-pink-500 flex items-center justify-center mt-0.5">
          <span className="text-white text-xs font-bold">L</span>
        </div>

        <div className="flex-1 min-w-0">
          <div
            className={`text-sm leading-relaxed ${
              isError ? 'text-red-600' : 'text-slate-800'
            }`}
          >
            {isError ? (
              <p>{message.content}</p>
            ) : (
              <div className="prose prose-sm max-w-none
                prose-p:my-1 prose-p:leading-relaxed
                prose-ul:my-1 prose-ul:pl-5
                prose-ol:my-1 prose-ol:pl-5
                prose-li:my-0.5
                prose-strong:font-semibold prose-strong:text-slate-900
                prose-a:text-blue-600 prose-a:underline hover:prose-a:text-blue-800
                prose-code:bg-slate-100 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-xs prose-code:font-mono prose-code:text-slate-700
                prose-pre:bg-slate-900 prose-pre:text-slate-100 prose-pre:rounded-lg prose-pre:p-3 prose-pre:overflow-x-auto prose-pre:text-xs
                prose-blockquote:border-l-2 prose-blockquote:border-slate-300 prose-blockquote:pl-3 prose-blockquote:text-slate-500 prose-blockquote:italic
                prose-h1:text-base prose-h1:font-bold prose-h1:text-slate-900
                prose-h2:text-sm prose-h2:font-semibold prose-h2:text-slate-900
                prose-h3:text-sm prose-h3:font-medium prose-h3:text-slate-900
              ">
                <ReactMarkdown
                  components={{
                    a: ({ href, children, ...props }) => (
                      <a href={href} target={href?.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" {...props}>
                        {children}
                      </a>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            )}
          </div>

          {/* Copy button — visible on hover */}
          {!isError && (
            <div className="mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-green-500" />
                    <span className="text-green-600">Kopirano</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Kopiraj</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
