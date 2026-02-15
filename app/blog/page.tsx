import { Metadata } from 'next'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import BlogContent from './blog-content'

export const metadata: Metadata = {
  title: 'Vodiči & Nasveti',
  description: 'Praktični nasveti, cenovni vodiči in strokovna mnenja za prenovo, gradnjo in vzdrževanje doma.',
  openGraph: {
    title: 'Vodiči & Nasveti | LiftGO',
    description: 'Praktični nasveti za lastnike: od prenove kopalnice do izbire pravega obrtnika.',
    type: 'website',
  }
}

export default function BlogPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <BlogContent />
      </main>
      <Footer />
    </div>
  )
}
