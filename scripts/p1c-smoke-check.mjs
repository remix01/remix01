import { readFileSync, existsSync } from 'node:fs'

const checks = []

function addCheck(name, pass, details) {
  checks.push({ name, pass, details })
}

function file(path) {
  if (!existsSync(path)) throw new Error(`Missing file: ${path}`)
  return readFileSync(path, 'utf8')
}

try {
  const bottomNav = file('components/obrtnik/bottom-nav.tsx')
  const navMatches = [...bottomNav.matchAll(/href:\s*'\/obrtnik\//g)]
  addCheck('/obrtnik/dashboard mobile nav has 6 items', navMatches.length === 6, `found ${navMatches.length} mobile nav items`)
  addCheck('active nav state supports nested /obrtnik routes', /pathname\.startsWith\(`\$\{href\}\/`\)/.test(bottomNav), 'expects startsWith nested route matcher')

  const ponudbePage = file('app/(obrtnik)/obrtnik/ponudbe/page.tsx')
  addCheck('/obrtnik/ponudbe renders tabs UI', /Tabs|TabsList|TabsTrigger/.test(ponudbePage), 'expects tabs primitives in obrtnik ponudbe page')

  addCheck('/obrtnik/sporocila route exists', existsSync('app/(obrtnik)/obrtnik/sporocila/page.tsx'), 'route file present')
  addCheck('/partner-dashboard/sporocila route exists', existsSync('app/partner-dashboard/sporocila/page.tsx'), 'route file present')

  const resetPage = file('app/posodobi-geslo/page.tsx')
  addCheck('/posodobi-geslo renders recovery/update-password UI markers', /geslo|password|Posodobi|ponastav/i.test(resetPage), 'basic recovery/update-password text markers present')
} catch (err) {
  console.error('Smoke checks failed to execute:', err.message)
  process.exit(1)
}

const failed = checks.filter((c) => !c.pass)
for (const c of checks) {
  console.log(`${c.pass ? 'PASS' : 'FAIL'}: ${c.name} (${c.details})`)
}

if (failed.length > 0) {
  console.error(`\n${failed.length} smoke check(s) failed.`)
  process.exit(1)
}

console.log(`\nAll ${checks.length} P1c smoke checks passed.`)
