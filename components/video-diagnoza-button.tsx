'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { VideoDiagnozaModal } from '@/components/video-diagnoza-modal'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Video } from 'lucide-react'

interface VideoDiagnozaButtonProps {
  variant?: 'floating' | 'inline'
}

export function VideoDiagnozaButton({ variant = 'inline' }: VideoDiagnozaButtonProps) {
  const [open, setOpen] = useState(false)

  if (variant === 'floating') {
    return (
      <>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 z-40 flex h-14 items-center gap-2 rounded-full bg-primary px-6 text-primary-foreground shadow-lg transition-all hover:scale-105 hover:shadow-xl sm:h-16 sm:px-8"
              >
                <Video className="h-5 w-5 sm:h-6 sm:w-6" />
                <span className="hidden font-semibold sm:inline">
                  Brezplačna Video Diagnoza
                </span>
                <span className="font-semibold sm:hidden">
                  Video Diagnoza
                </span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="left" className="max-w-xs">
              <p>Posnemi ali naloži video težave — mojster ti odgovori v 2 urah</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <VideoDiagnozaModal open={open} onOpenChange={setOpen} />
      </>
    )
  }

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              onClick={() => setOpen(true)}
              size="lg"
              className="gap-2 min-h-[48px]"
            >
              <Video className="h-5 w-5" />
              Brezplačna Video Diagnoza
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            <p>Posnemi ali naloži video težave — mojster ti odgovori v 2 urah</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <VideoDiagnozaModal open={open} onOpenChange={setOpen} />
    </>
  )
}
