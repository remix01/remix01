import { getActiveCategoriesPublic } from '../lib/dal/categories'
import { SLOVENIAN_CITIES } from '../lib/seo/locations'
import { buildSeoContent, isSeoIndexablePage } from '../lib/seo/programmatic-content'

async function run() {
  const categories = await getActiveCategoriesPublic().catch(() => [])
  let indexableCategories = 0
  let indexableCities = 0
  let missingFaq = 0
  let weakPages = 0
  const titles = new Map()

  for (const category of categories) {
    const c = buildSeoContent({ categoryName: category.name, categorySlug: category.slug })
    const cOk = isSeoIndexablePage({ categorySlug: category.slug, canonicalCategorySlug: category.slug, contentBlocks: [c.categoryIntro, c.whatToExpect, ...c.faqItems.map(f => f.question)] })
    if (cOk) indexableCategories++
    if (c.faqItems.length < 3) missingFaq++
    titles.set(c.categoryTitle, (titles.get(c.categoryTitle) || 0) + 1)

    for (const city of SLOVENIAN_CITIES) {
      const s = buildSeoContent({ categoryName: category.name, categorySlug: category.slug, citySlug: city.slug, cityName: city.name })
      const ok = isSeoIndexablePage({ categorySlug: category.slug, citySlug: city.slug, canonicalCategorySlug: category.slug, contentBlocks: [s.categoryIntro, s.whatToExpect, s.cityIntro || '', ...s.faqItems.map(f => f.answer)] })
      if (ok) indexableCities++
      else weakPages++
      if (s.faqItems.length < 3) missingFaq++
      titles.set(s.categoryTitle, (titles.get(s.categoryTitle) || 0) + 1)
    }
  }

  const duplicateTitles = [...titles.entries()].filter(([, n]) => n > 1).length
  console.log(JSON.stringify({
    categories: categories.length,
    indexableCategories,
    indexableCities,
    missingFaq,
    weakPages,
    duplicateTitles,
    sitemapCandidates: indexableCategories + indexableCities,
  }, null, 2))
}

run()
