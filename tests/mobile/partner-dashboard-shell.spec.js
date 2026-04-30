const { test, expect } = require('@playwright/test')

test.describe('partner-dashboard mobile shell regression', () => {
  test('no horizontal overflow + stable shell screenshot', async ({ page, baseURL }) => {
    test.skip(!process.env.PLAYWRIGHT_STORAGE_STATE, 'Set PLAYWRIGHT_STORAGE_STATE for authenticated partner session.')

    await page.goto('/partner-dashboard', { waitUntil: 'networkidle' })

    // Shell sanity: no desktop offset leak on mobile.
    const overflow = await page.evaluate(() => {
      const html = document.documentElement
      const body = document.body
      return {
        viewport: window.innerWidth,
        htmlScroll: html.scrollWidth,
        bodyScroll: body.scrollWidth,
      }
    })

    expect(overflow.htmlScroll).toBeLessThanOrEqual(overflow.viewport + 1)
    expect(overflow.bodyScroll).toBeLessThanOrEqual(overflow.viewport + 1)

    await expect(page).toHaveScreenshot('partner-dashboard-mobile-shell.png', {
      fullPage: true,
      animations: 'disabled',
    })
  })
})
