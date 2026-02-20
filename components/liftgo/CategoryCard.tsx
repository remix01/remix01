import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { Category } from '@/types/liftgo.types'
import { 
  Hammer, 
  Droplet, 
  Zap, 
  Wrench,
  PaintBucket,
  DoorOpen,
  Trees,
  Settings,
  Briefcase,
  MoreHorizontal
} from 'lucide-react'

interface CategoryCardProps {
  category: Category
  href?: string
  onClick?: () => void
  selected?: boolean
  className?: string
}

const categoryIcons: Record<string, typeof Hammer> = {
  'Gradnja & adaptacije': Hammer,
  'Vodovod & ogrevanje': Droplet,
  'Elektrika & pametni sistemi': Zap,
  'Mizarstvo & kovinarstvo': Wrench,
  'Zaključna dela': PaintBucket,
  'Okna, vrata & senčila': DoorOpen,
  'Okolica & zunanja ureditev': Trees,
  'Vzdrževanje & popravila': Settings,
  'Poslovne storitve': Briefcase,
  'Drugo': MoreHorizontal
}

export function CategoryCard({ category, href, onClick, selected, className }: CategoryCardProps) {
  const Icon = categoryIcons[category.name] || MoreHorizontal
  
  const content = (
    <Card className={cn(
      'group cursor-pointer transition-all hover:border-primary hover:shadow-md',
      selected && 'border-primary bg-primary/5',
      className
    )}>
      <div className="flex flex-col items-center gap-3 p-4 text-center">
        <div className={cn(
          'flex h-12 w-12 items-center justify-center rounded-full transition-colors',
          selected ? 'bg-primary text-primary-foreground' : 'bg-primary/10 text-primary group-hover:bg-primary group-hover:text-primary-foreground'
        )}>
          <Icon className="h-6 w-6" />
        </div>
        <div>
          <p className={cn(
            'text-sm font-medium transition-colors',
            selected ? 'text-primary' : 'text-foreground group-hover:text-primary'
          )}>
            {category.name}
          </p>
          {category.description && (
            <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
              {category.description}
            </p>
          )}
        </div>
      </div>
    </Card>
  )

  if (href) {
    return <Link href={href}>{content}</Link>
  }

  return <div onClick={onClick}>{content}</div>
}
