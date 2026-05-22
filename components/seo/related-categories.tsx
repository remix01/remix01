import Link from 'next/link'
import { getActiveCategories } from '@/lib/dal/categories'
import { getRelatedCategoryLinks } from '@/lib/seo/programmatic-content'

interface RelatedCategoriesProps {
  currentCategorySlug: string
  citySlug?: string
}

export async function RelatedCategories({
  currentCategorySlug,
  citySlug
}: RelatedCategoriesProps) {
  try {
    const categories = await getActiveCategories()
    
    // Filter out current category and get 6 related ones
    const related = getRelatedCategoryLinks(categories, currentCategorySlug, citySlug)

    if (related.length === 0) {
      return null
    }

    return (
      <section className="py-12 md:py-20">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-12">
            Podobne storitve
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {related.map(category => {
              return (
                <Link
                  key={category.href}
                  href={category.href}
                  className="p-6 border rounded-lg hover:shadow-lg transition-shadow bg-white"
                >
                  <h3 className="text-lg font-semibold mb-2">
                    {category.label}
                  </h3>
                  <p className="text-gray-600 text-sm mb-4">
                    {'Preverjeni strokovnjaki za ' + category.label.toLowerCase()}
                  </p>
                  <span className="text-blue-600 font-medium text-sm hover:underline">
                    Preberi več →
                  </span>
                </Link>
              )
            })}
          </div>
        </div>
      </section>
    )
  } catch (error) {
    console.error('[v0] Error fetching related categories:', error)
    return null
  }
}
