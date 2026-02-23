import fs from 'fs'
import path from 'path'

// Manual frontmatter parser to replace gray-matter
function parseFrontmatter(content: string) {
  const lines = content.split('\n')
  const data: Record<string, any> = {}
  let i = 1 // skip first ---
  while (i < lines.length && lines[i] !== '---') {
    const [key, ...val] = lines[i].split(':')
    if (key && val.length) {
      let value = val.join(':').trim().replace(/^["']|["']$/g, '')
      // Try to parse as number
      if (!isNaN(Number(value))) {
        data[key.trim()] = Number(value)
      } else {
        data[key.trim()] = value
      }
    }
    i++
  }
  const body = lines.slice(i + 1).join('\n')
  return { data, content: body }
}

export interface BlogPost {
  title: string
  slug: string
  date: string
  category: string
  city?: string
  description: string
  readTime: number
  content: string
}

const blogDir = path.join(process.cwd(), 'content', 'blog')

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(blogDir)) {
    return []
  }

  const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.mdx'))

  const posts = await Promise.all(
    files.map(async file => {
      const filePath = path.join(blogDir, file)
      const fileContent = fs.readFileSync(filePath, 'utf-8')
      const { data, content } = parseFrontmatter(fileContent)

      return {
        title: String(data.title || ''),
        slug: String(data.slug || ''),
        date: String(data.date || ''),
        category: String(data.category || ''),
        city: data.city ? String(data.city) : undefined,
        description: String(data.description || ''),
        readTime: Number(data.readTime || 5),
        content
      }
    })
  )

  // Sort by date descending
  return posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
}

export async function getPostBySlug(slug: string): Promise<BlogPost | null> {
  try {
    const filePath = path.join(blogDir, `${slug}.mdx`)
    
    if (!fs.existsSync(filePath)) {
      return null
    }

    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = parseFrontmatter(fileContent)

    return {
      title: String(data.title || ''),
      slug: String(data.slug || ''),
      date: String(data.date || ''),
      category: String(data.category || ''),
      city: data.city ? String(data.city) : undefined,
      description: String(data.description || ''),
      readTime: Number(data.readTime || 5),
      content
    }
  } catch (error) {
    console.error(`Error reading blog post ${slug}:`, error)
    return null
  }
}

export async function getPostsByCategory(category: string): Promise<BlogPost[]> {
  const posts = await getAllPosts()
  return posts.filter(post => post.category === category)
}

export async function getRelatedPosts(category: string, currentSlug: string, limit = 3): Promise<BlogPost[]> {
  const posts = await getPostsByCategory(category)
  return posts
    .filter(post => post.slug !== currentSlug)
    .slice(0, limit)
}
