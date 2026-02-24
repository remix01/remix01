import { readdirSync, statSync, readFileSync } from 'fs'
import { join, extname } from 'path'

const ROOT = process.cwd()
const THRESHOLD = 100 * 1024 // 100 KiB

function walk(dir) {
  const entries = readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === '.next') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) {
      walk(full)
    } else if (['.ts', '.tsx', '.js', '.jsx'].includes(extname(entry.name))) {
      const { size } = statSync(full)
      if (size >= THRESHOLD) {
        console.log(`${(size / 1024).toFixed(1)} KiB  ${full.replace(ROOT + '/', '')}`)
      }
    }
  }
}

walk(ROOT)
