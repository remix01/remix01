const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

const NEXT_CONFIG_FILE = 'next.config.ts'
const CUSTOMER_SIDEBAR_FILE = 'components/dashboard/stranka/Sidebar.tsx'

const nextConfigSource = fs.readFileSync(path.join(process.cwd(), NEXT_CONFIG_FILE), 'utf8')
const customerSidebarSource = fs.readFileSync(path.join(process.cwd(), CUSTOMER_SIDEBAR_FILE), 'utf8')

describe('Customer route consolidation contract', () => {
  it('redirects only confirmed legacy /dashboard/stranka routes to canonical customer routes', () => {
    expect(nextConfigSource).toMatch(/source:\s*'\/dashboard\/stranka'/)
    expect(nextConfigSource).toMatch(/destination:\s*'\/dashboard'/)

    expect(nextConfigSource).toMatch(/source:\s*'\/dashboard\/stranka\/povprasevanja'/)
    expect(nextConfigSource).toMatch(/destination:\s*'\/povprasevanja'/)

    expect(nextConfigSource).toMatch(/source:\s*'\/dashboard\/stranka\/sporocila'/)
    expect(nextConfigSource).toMatch(/destination:\s*'\/sporocila'/)
  })

  it('does not add redirect rules for unresolved legacy routes yet', () => {
    expect(nextConfigSource).not.toMatch(/source:\s*'\/dashboard\/stranka\/profil'/)
    expect(nextConfigSource).not.toMatch(/source:\s*'\/dashboard\/stranka\/povprasevanja\/:id'/)
    expect(nextConfigSource).toMatch(/TODO\(route-consolidation\)/)
  })

  it('avoids redirect loops between canonical and legacy customer routes', () => {
    expect(nextConfigSource).not.toMatch(/source:\s*'\/dashboard'\s*,[\s\S]*destination:\s*'\/dashboard\/stranka'/)
    expect(nextConfigSource).not.toMatch(/source:\s*'\/povprasevanja'\s*,[\s\S]*destination:\s*'\/dashboard\/stranka\/povprasevanja'/)
    expect(nextConfigSource).not.toMatch(/source:\s*'\/sporocila'\s*,[\s\S]*destination:\s*'\/dashboard\/stranka\/sporocila'/)
  })

  it('uses canonical customer paths in sidebar navigation items where replacement is confirmed', () => {
    expect(customerSidebarSource).toMatch(/href:\s*'\/dashboard'/)
    expect(customerSidebarSource).toMatch(/href:\s*'\/povprasevanja'/)
    expect(customerSidebarSource).toMatch(/href:\s*'\/sporocila'/)

    expect(customerSidebarSource).toMatch(/href:\s*'\/dashboard\/stranka\/profil'/)
    expect(customerSidebarSource).toMatch(/TODO\(route-consolidation\)/)
  })
})
