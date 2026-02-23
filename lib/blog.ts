import fs from 'fs'
import path from 'path'

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

// Manual frontmatter parser - splits on ---
function parseFrontmatter(fileContent: string): { data: Record<string, any>; content: string } {
  const lines = fileContent.split('\n')
  let frontmatterEnd = -1
  let inFrontmatter = false

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '---') {
      if (!inFrontmatter) {
        inFrontmatter = true
      } else {
        frontmatterEnd = i
        break
      }
    }
  }

  if (frontmatterEnd === -1) {
    // No frontmatter found
    return { data: {}, content: fileContent }
  }

  const frontmatterLines = lines.slice(1, frontmatterEnd)
  const content = lines.slice(frontmatterEnd + 1).join('\n')

  // Parse YAML-like frontmatter
  const data: Record<string, any> = {}
  for (const line of frontmatterLines) {
    if (!line.trim()) continue
    const colonIndex = line.indexOf(':')
    if (colonIndex > -1) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim().replace(/^['"]|['"]$/g, '')
      data[key] = value
    }
  }

  return { data, content }
}

export async function getAllPosts(): Promise<BlogPost[]> {
  if (!fs.existsSync(blogDir)) {
    return []
  }

  const files = fs.readdirSync(blogDir).filter(file => file.endsWith('.mdx'))

  const posts = files.map(file => {
    const filePath = path.join(blogDir, file)
    const fileContent = fs.readFileSync(filePath, 'utf-8')
    const { data, content } = parseFrontmatter(fileContent)

    return {
      title: data.title || 'Untitled',
      slug: data.slug || file.replace('.mdx', ''),
      date: data.date || new Date().toISOString(),
      category: data.category || 'general',
      city: data.city,
      description: data.description || '',
      readTime: parseInt(data.readTime) || 5,
      content
    }
  })

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
      title: data.title || 'Untitled',
      slug: data.slug || slug,
      date: data.date || new Date().toISOString(),
      category: data.category || 'general',
      city: data.city,
      description: data.description || '',
      readTime: parseInt(data.readTime) || 5,
      content
    }
  } catch (error) {
    console.error(`[v0] Error reading blog post ${slug}:`, error)
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
