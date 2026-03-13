'use client'

import { useState, useEffect } from 'react'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface PortfolioModalProps {
  project: any
  allItems: any[]
  onClose: () => void
}

export function PortfolioModal({ project, allItems, onClose }: PortfolioModalProps) {
  const [currentProject, setCurrentProject] = useState(project)
  const [currentImageIndex, setCurrentImageIndex] = useState(0)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') goToPreviousProject()
      if (e.key === 'ArrowRight') goToNextProject()
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const currentImages = currentProject.image_urls || []
  const currentProjectIndex = allItems.findIndex((item) => item.id === currentProject.id)

  const goToPreviousProject = () => {
    const newIndex = (currentProjectIndex - 1 + allItems.length) % allItems.length
    setCurrentProject(allItems[newIndex])
    setCurrentImageIndex(0)
  }

  const goToNextProject = () => {
    const newIndex = (currentProjectIndex + 1) % allItems.length
    setCurrentProject(allItems[newIndex])
    setCurrentImageIndex(0)
  }

  const goToPreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev - 1 + currentImages.length) % currentImages.length)
  }

  const goToNextImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    setCurrentImageIndex((prev) => (prev + 1) % currentImages.length)
  }

  return (
    <div
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-auto flex"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 right-4 z-10 rounded-full bg-white hover:bg-gray-100"
          onClick={onClose}
        >
          <X className="w-6 h-6" />
        </Button>

        {/* Left Side - Image */}
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 min-h-[400px] relative">
          {currentImages.length > 0 ? (
            <>
              <img
                src={currentImages[currentImageIndex]}
                alt={currentProject.title}
                className="max-h-[70vh] max-w-full object-contain"
              />

              {/* Image Navigation */}
              {currentImages.length > 1 && (
                <>
                  <button
                    onClick={goToPreviousImage}
                    className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <button
                    onClick={goToNextImage}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-2 rounded-full transition"
                  >
                    <ChevronRight className="w-6 h-6" />
                  </button>

                  {/* Image Counter */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-full text-sm">
                    {currentImageIndex + 1} / {currentImages.length}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-full text-gray-400">
              Ni slike
            </div>
          )}
        </div>

        {/* Right Side - Details */}
        <div className="w-full md:w-80 p-6 flex flex-col justify-between border-l overflow-y-auto">
          {/* Project Info */}
          <div className="space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">{currentProject.title}</h2>
              {currentProject.category && (
                <Badge variant="secondary" className="text-xs">
                  {currentProject.category}
                </Badge>
              )}
            </div>

            {/* Details */}
            <div className="space-y-4">
              {currentProject.completed_at && (
                <div>
                  <p className="text-sm text-gray-600">Zaključeno</p>
                  <p className="font-semibold text-gray-900">
                    {new Date(currentProject.completed_at).toLocaleDateString('sl-SI')}
                  </p>
                </div>
              )}

              {currentProject.price_approx && (
                <div>
                  <p className="text-sm text-gray-600">Orientacijska cena</p>
                  <p className="font-semibold text-gray-900">~{currentProject.price_approx}€</p>
                </div>
              )}

              {currentProject.duration_days && (
                <div>
                  <p className="text-sm text-gray-600">Trajanje</p>
                  <p className="font-semibold text-gray-900">{currentProject.duration_days} dni</p>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="flex gap-2 pt-6 border-t">
            <Button
              variant="outline"
              className="flex-1"
              onClick={goToPreviousProject}
              disabled={allItems.length === 1}
            >
              ← Prejšnji
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={goToNextProject}
              disabled={allItems.length === 1}
            >
              Naslednji →
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
