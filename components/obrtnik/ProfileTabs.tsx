'use client'

import { useState } from 'react'
import { PortfolioTab } from './tabs/PortfolioTab'
import { ReviewsTab } from './tabs/ReviewsTab'
import { AboutTab } from './tabs/AboutTab'
import { CoverageTab } from './tabs/CoverageTab'
import type { ServiceAreaDisplay } from '@/lib/types'

interface ProfileTabsProps {
  obrtnik: any
  portfolioItems: any[]
  reviews: any[]
  serviceAreas: ServiceAreaDisplay[]
  availability: any[]
}

export function ProfileTabs({
  obrtnik,
  portfolioItems,
  reviews,
  serviceAreas,
  availability,
}: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<'portfolio' | 'reviews' | 'about' | 'coverage'>('portfolio')

  const tabs = [
    { id: 'portfolio', label: `Portfolio (${portfolioItems.length})` },
    { id: 'reviews', label: `Ocene (${reviews.length})` },
    { id: 'about', label: 'O mojstru' },
    { id: 'coverage', label: 'Pokritost & urnik' },
  ]

  return (
    <div>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <div className="flex gap-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-3 font-medium border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#0F3460] text-[#0F3460]'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'portfolio' && <PortfolioTab items={portfolioItems} />}
        {activeTab === 'reviews' && <ReviewsTab obrtnik={obrtnik} reviews={reviews} />}
        {activeTab === 'about' && <AboutTab obrtnik={obrtnik} />}
        {activeTab === 'coverage' && <CoverageTab serviceAreas={serviceAreas} availability={availability} />}
      </div>
    </div>
  )
}
