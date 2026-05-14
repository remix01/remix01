'use client'

import Image from 'next/image'
import { useState, type MouseEvent } from 'react'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'

interface PortfolioImage {
  id: string
  url: string
  title?: string
  description?: string
}

interface PortfolioGalleryProps {
  images: PortfolioImage[]
  title?: string
}

export function PortfolioGallery({ images, title = 'Portfelj' }: PortfolioGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)

  if (!images || images.length === 0) {
    return null
  }

  const currentImage = selectedIndex !== null ? images[selectedIndex] : null

  return (
    <>
      {/* Gallery Grid */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setSelectedIndex(idx)}
              className="relative group overflow-hidden rounded-lg bg-slate-100 aspect-square"
            >
              <Image
                src={img.url}
                alt={img.title || 'Portfolio image'}
                fill
                className="object-cover transition-transform group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
            </button>
          ))}
        </div>
      </div>

      {/* Inline Tailwind Lightbox - NO external modal dependency */}
      {selectedIndex !== null && currentImage && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center"
          onClick={() => setSelectedIndex(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setSelectedIndex(null)}
            className="absolute top-4 right-4 z-50 p-2 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </button>

          {/* Navigation Buttons */}
          {images.length > 1 && (
            <>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation()
                  setSelectedIndex(selectedIndex === 0 ? images.length - 1 : selectedIndex - 1)
                }}
                className="absolute left-4 z-50 text-white hover:bg-slate-800"
              >
                <ChevronLeft className="w-6 h-6" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={(e: MouseEvent) => {
                  e.stopPropagation()
                  setSelectedIndex(selectedIndex === images.length - 1 ? 0 : selectedIndex + 1)
                }}
                className="absolute right-4 z-50 text-white hover:bg-slate-800"
              >
                <ChevronRight className="w-6 h-6" />
              </Button>
            </>
          )}

          {/* Image */}
          <div
            className="relative w-full h-full max-w-4xl"
            onClick={(e: MouseEvent) => e.stopPropagation()}
          >
            <Image
              src={currentImage.url}
              alt={currentImage.title || 'Portfolio image'}
              fill
              className="object-contain"
            />
          </div>

          {/* Image Info */}
          <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur text-white p-4 rounded-lg">
            {currentImage.title && (
              <p className="font-semibold">{currentImage.title}</p>
            )}
            {currentImage.description && (
              <p className="text-sm text-gray-200 mt-1">{currentImage.description}</p>
            )}
            <p className="text-xs text-gray-400 mt-2">
              {selectedIndex + 1} / {images.length}
            </p>
          </div>
        </div>
      )}
    </>
  )
}