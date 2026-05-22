const base = process.env.MARKET_BASE_URL || 'http://127.0.0.1:4010'
const routes = [
  '/',
  '/mojstri',
  '/novo-povprasevanje',
  '/ogrevanje/ljubljana',
  '/klimatizacija/ljubljana',
  '/elektrika/ljubljana',
  '/varovanje/ljubljana',
  '/plumber/london',
  '/heating/vienna',
  '/electrician/zagreb',
  '/actuator/env',
  '/__depproxyproof',
]

let failed = 0
for (const path of routes) {
  const res = await fetch(`${base}${path}`, { redirect: 'manual' }).catch(() => null)
  if (!res) {
    console.log(`FAIL ${path} network_error`)
    failed += 1
    continue
  }
  const ok = [200, 307, 308, 404].includes(res.status)
  console.log(`${ok ? 'PASS' : 'FAIL'} ${path} ${res.status}`)
  if (!ok) failed += 1
}

if (failed > 0) process.exit(1)
