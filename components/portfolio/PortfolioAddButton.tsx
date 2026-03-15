'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import { PortfolioItemForm } from './portfolio-item-form'

interface PortfolioAddButtonProps {
  obrtnikId: string
  featuredCount: number
}

export function PortfolioAddButton({ obrtnikId, featuredCount }: PortfolioAddButtonProps) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition"
      >
        <Plus className="w-5 h-5" />
        Dodaj projekt
      </button>
      {isOpen && (
        <PortfolioItemForm
          obrtnikId={obrtnikId}
          featuredCount={featuredCount}
          onClose={() => setIsOpen(false)}
          onSaved={() => {
            setIsOpen(false)
            window.location.reload()
          }}
        />
      )}
    </>
  )
}
