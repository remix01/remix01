'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { PortfolioModal } from '../PortfolioModal'

interface PortfolioTabProps {
  items: any[]
}

export function PortfolioTab({ items }: PortfolioTabProps) {
  const [selectedProject, setSelectedProject] = useState<any | null>(null)

  if (!items || items.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Ni razpoložljivih projektov v portfoliu</p>
      </div>
    )
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => setSelectedProject(item)}
            className="group relative overflow-hidden rounded-lg aspect-square cursor-pointer"
          >
            {item.image_urls && item.image_urls[0] ? (
              <img
                src={item.image_urls[0]}
                alt={item.title}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                <span className="text-gray-400">Ni slike</span>
              </div>
            )}

            {/* Overlay on Hover */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
              <p className="text-white font-semibold text-center text-sm">{item.title}</p>
            </div>

            {/* Category Badge */}
            {item.category && (
              <div className="absolute top-2 left-2">
                <Badge variant="secondary" className="text-xs">
                  {item.category}
                </Badge>
              </div>
            )}

            {/* Price Badge */}
            {item.price_approx && (
              <div className="absolute bottom-2 left-2">
                <Badge className="bg-white text-gray-900 text-xs">
                  ~{item.price_approx}€
                </Badge>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Modal */}
      {selectedProject && (
        <PortfolioModal
          project={selectedProject}
          allItems={items}
          onClose={() => setSelectedProject(null)}
        />
      )}
    </>
  )
}
