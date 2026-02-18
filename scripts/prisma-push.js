import { execSync } from 'child_process'

console.log('[v0] Starting Prisma db push...')

try {
  console.log('[v0] Running: npx prisma db push --accept-data-loss')
  
  const result = execSync('npx prisma db push --accept-data-loss', {
    cwd: process.cwd(),
    stdio: 'inherit',
    env: { ...process.env }
  })
  
  console.log('[v0] Prisma db push completed successfully')
  console.log('[v0] Database schema synced with Supabase')
  process.exit(0)
} catch (error) {
  console.error('[v0] Prisma db push failed:')
  console.error(error)
  process.exit(1)
}
