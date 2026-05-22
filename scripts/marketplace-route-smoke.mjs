#!/usr/bin/env node

const baseUrl = process.env.SMOKE_BASE_URL || 'http://localhost:3000'

const checks = [
  ['/', [200]],
  ['/klimatizacija', [200]],
  ['/klimatizacija/ljubljana', [200]],
  ['/klimatizacija/kranj', [200]],
  ['/ogrevanje/ljubljana', [200]],
  ['/elektrika/ljubljana', [200]],
  ['/mojstri', [200]],
  ['/mojstri?city=ljubljana', [200]],
  ['/novo-povprasevanje', [200]],
  ['/not-a-real-category/ljubljana', [404]],
  ['/actuator/env', [404]],
]

let failures = 0

for (const [path, allowedStatuses] of checks) {
  const url = `${baseUrl}${path}`
  try {
    const response = await fetch(url, { redirect: 'manual' })
    const ok = allowedStatuses.includes(response.status)
    const marker = ok ? 'PASS' : 'FAIL'
    console.log(`[${marker}] ${response.status} ${path}`)
    if (!ok) failures += 1
  } catch (error) {
    failures += 1
    console.log(`[FAIL] ERR ${path} :: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (failures > 0) {
  console.error(`\nSmoke checks failed: ${failures}`)
  process.exit(1)
}

console.log('\nSmoke checks passed.')
