const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')
const THRESHOLD = 100 * 1024 // 100 KiB

function walk(dir, results = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (['node_modules', '.next', '.git'].includes(entry.name)) continue
      walk(full, results)
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      const size = fs.statSync(full).size
      if (size >= THRESHOLD) results.push({ size, file: full.replace(ROOT + '/', '') })
    }
  }
  return results
}

const large = walk(ROOT).sort((a, b) => b.size - a.size)
if (large.length === 0) {
  console.log('No files over 100 KiB found.')
} else {
  for (const { size, file } of large) {
    console.log(`${(size / 1024).toFixed(1)} KiB  ${file}`)
  }
}
