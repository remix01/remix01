const NOINDEX_PATH_PREFIXES = ['/admin', '/auth', '/api']

type EnvLike = Record<string, string | undefined>

function isTruthy(value?: string): boolean {
  if (!value) return false
  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase())
}

export function isIndexingAllowed(env: EnvLike = process.env): boolean {
  if (isTruthy(env.ALLOW_INDEXING)) return true
  return env.VERCEL_ENV === 'production'
}

export function shouldNoindexPath(pathname: string, indexingAllowed: boolean): boolean {
  if (!indexingAllowed) return true
  return NOINDEX_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function getRobotsHeaderValue(pathname: string, env: EnvLike = process.env): string | null {
  const indexingAllowed = isIndexingAllowed(env)
  return shouldNoindexPath(pathname, indexingAllowed) ? 'noindex, nofollow' : null
}
