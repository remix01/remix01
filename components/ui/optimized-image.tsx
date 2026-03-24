import Image, { ImageProps } from 'next/image'
import { cn } from '@/lib/utils'

const BLUR_DATA_URL = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAAIAAoDASIAAhEBAxEB/8QAFgABAQEAAAAAAAAAAAAAAAAAAAUH/8QAIhAAAgEDBAMBAAAAAAAAAAAAAQIDBBEABQYSITFBYXH/xAAVAQEBAAAAAAAAAAAAAAAAAAADBP/EABkRAQADAQEAAAAAAAAAAAAAAAEAAhEDMf/aAAwDAQACEQMRAD8AqNs+M7Nhk1xNPKs0sjOYwOQQMdAHr3rT/ZqaK9Uf/9k='

const ASPECT_CLASSES = {
  '1:1': 'aspect-square',
  '4:3': 'aspect-[4/3]',
  '16:9': 'aspect-video',
  '3:2': 'aspect-[3/2]',
  auto: '',
} as const

interface OptimizedImageProps extends Omit<ImageProps, 'alt'> {
  alt: string
  aspectRatio?: '1:1' | '4:3' | '16:9' | '3:2' | 'auto'
  fallbackSrc?: string
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  aspectRatio = 'auto',
  className,
  priority = false,
  fallbackSrc,
  ...props
}: OptimizedImageProps) {
  const isSupabaseStorage = typeof src === 'string' && src.includes('supabase.co/storage')

  return (
    <div className={cn('relative overflow-hidden', ASPECT_CLASSES[aspectRatio], className)}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        priority={priority}
        loading={priority ? 'eager' : 'lazy'}
        placeholder="blur"
        blurDataURL={BLUR_DATA_URL}
        quality={isSupabaseStorage ? 100 : 85}
        className="object-cover"
        onError={(e) => {
          if (fallbackSrc) {
            const target = e.target as HTMLImageElement
            if (target.src !== fallbackSrc) target.src = fallbackSrc
          }
        }}
        {...props}
      />
    </div>
  )
}

export function HeroImage({
  src,
  alt,
  className,
  sizes = '100vw',
  ...props
}: Omit<OptimizedImageProps, 'priority' | 'width' | 'height'> & { sizes?: string }) {
  return (
    <Image
      src={src}
      alt={alt}
      priority
      fill
      sizes={sizes}
      placeholder="blur"
      blurDataURL={BLUR_DATA_URL}
      className={cn('object-cover', className)}
      {...props}
    />
  )
}

export function ThumbnailImage({
  src,
  alt,
  className,
  ...props
}: Omit<OptimizedImageProps, 'width' | 'height' | 'aspectRatio'>) {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      width={400}
      height={267}
      aspectRatio="3:2"
      className={cn('rounded-lg', className)}
      {...props}
    />
  )
}

export function ProfileImage({
  src,
  alt,
  size = 40,
  className,
}: {
  src?: string | null
  alt: string
  size?: number
  className?: string
}) {
  const initials = alt.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)

  if (!src) {
    return (
      <div
        className={cn('flex items-center justify-center rounded-full bg-primary/10 text-primary font-semibold', className)}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
        aria-label={alt}
      >
        {initials}
      </div>
    )
  }

  return (
    <div className={cn('relative overflow-hidden rounded-full', className)} style={{ width: size, height: size }}>
      <Image src={src} alt={alt} width={size} height={size} className="object-cover" placeholder="blur" blurDataURL={BLUR_DATA_URL} />
    </div>
  )
}