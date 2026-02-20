import { Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface RatingStarsProps {
  rating: number
  size?: 'sm' | 'md' | 'lg'
  showNumber?: boolean
  className?: string
}

export function RatingStars({ rating, size = 'md', showNumber = false, className }: RatingStarsProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  }

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base'
  }

  return (
    <div className={cn('flex items-center gap-1', className)}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            sizeClasses[size],
            i < Math.floor(rating) ? 'fill-accent text-accent' : 'text-muted-foreground/30'
          )}
        />
      ))}
      {showNumber && (
        <span className={cn('ml-1 font-semibold text-foreground', textSizeClasses[size])}>
          {rating.toFixed(1)}
        </span>
      )}
    </div>
  )
}
