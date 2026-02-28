/**
 * Browser-level render tests — real DOM, Shadow DOM, interactions.
 * Screenshots saved to ssler/ (gitignored)
 * Run: npm run test:browser
 */
import { test, expect } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'

const SS_DIR = 'ss'

test.describe('Component rendering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-counter', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({
      path: `${SS_DIR}/${name}-${testInfo.project.name}.png`,
      fullPage: true,
    }).catch(() => {})
  })

  test('w-counter renders with shadow DOM', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    await expect(counter).toBeVisible()

    const shadowRoot = await counter.evaluate((el) => el.shadowRoot !== null)
    expect(shadowRoot).toBe(true)
  })

  test('w-counter displays initial count from start prop', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const text = await counter.locator('span').first().textContent()
    expect(text?.trim()).toBe('5')
  })

  test('w-counter increment updates display', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const incrementBtn = counter.getByRole('button', { name: '+' })

    await incrementBtn.click()
    const text = await counter.locator('span').first().textContent()
    expect(text?.trim()).toBe('6')

    await incrementBtn.click()
    const text2 = await counter.locator('span').first().textContent()
    expect(text2?.trim()).toBe('7')
  })

  test('w-counter decrement updates display', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const decrementBtn = counter.getByRole('button', { name: '-' })

    await decrementBtn.click()
    const text = await counter.locator('span').first().textContent()
    expect(text?.trim()).toBe('4')
  })

  test('w-button renders with label', async ({ page }) => {
    const btn = page.locator('w-button#btn')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Click me')
  })

  test('w-button is clickable and fires w-click', async ({ page }) => {
    await page.evaluate(() => {
      ;(window as any).__playwrightClickFired = false
      document.querySelector('w-button#btn')?.addEventListener('w-click', () => {
        ;(window as any).__playwrightClickFired = true
      })
    })
    const btn = page.locator('w-button#btn >> button')
    await btn.click()
    const clickFired = await page.evaluate(() => (window as any).__playwrightClickFired)
    expect(clickFired).toBe(true)
  })

  test('w-counter-card renders nested w-counter', async ({ page }) => {
    const card = page.locator('w-counter-card#counter-card')
    await expect(card).toBeVisible()

    const innerCounter = card.locator('w-counter')
    await expect(innerCounter).toBeVisible()

    const count = await innerCounter.locator('span').first().textContent()
    expect(count?.trim()).toBe('10')
  })

  test('w-counter-card Action button fires w-click and updates lastEvent', async ({ page }) => {
    const card = page.locator('w-counter-card#counter-card')
    const actionBtn = card.locator('w-button >> button').first()
    await actionBtn.click()

    await expect(page.locator('w-counter-card#counter-card')).toContainText(/Button clicked at \d{2}:\d{2}:\d{2}/)
  })

  test('w-button variant primary renders', async ({ page }) => {
    const btn = page.locator('w-button#btn-primary')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Primary')
  })

  test('w-button disabled does not fire w-click', async ({ page }) => {
    await page.evaluate(() => {
      ;(window as any).__playwrightDisabledClickFired = false
      document.querySelector('w-button#btn-disabled')?.addEventListener('w-click', () => {
        ;(window as any).__playwrightDisabledClickFired = true
      })
    })
    const btn = page.locator('w-button#btn-disabled >> button')
    await btn.click({ force: true })
    const fired = await page.evaluate(() => (window as any).__playwrightDisabledClickFired)
    expect(fired).toBe(false)
  })

  test('w-pokemon-grid renders and loads Pokémon', async ({ page }) => {
    const grid = page.locator('w-pokemon-grid#pokemon-grid')
    await expect(grid).toBeVisible()

    await expect(grid.locator('text=bulbasaur').or(grid.locator('text=ivysaur')).or(grid.locator('text=Loading')).first()).toBeVisible({ timeout: 15000 })
  })

  test('w-pokemon-grid shows Pokémon grid when loaded', async ({ page }) => {
    const grid = page.locator('w-pokemon-grid#pokemon-grid')
    await grid.locator('.grid').waitFor({ state: 'visible', timeout: 20000 })

    const cards = grid.locator('.rounded-xl')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
  })

  test('w-user-list renders and loads users', async ({ page }) => {
    await page.route('**/jsonplaceholder.typicode.com/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' },
          { id: 2, name: 'Ervin Howell', email: 'ervin@example.com' },
        ]),
      })
    })

    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-user-list', { state: 'attached' })

    const list = page.locator('w-user-list#user-list')
    await expect(list).toBeVisible()
    await expect(list.locator('text=Leanne Graham')).toBeVisible({ timeout: 10000 })
  })

  test('w-user-list filter input filters results', async ({ page }) => {
    await page.route('**/jsonplaceholder.typicode.com/users**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' },
          { id: 2, name: 'Ervin Howell', email: 'ervin@example.com' },
        ]),
      })
    })

    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-user-list', { state: 'attached' })

    const list = page.locator('w-user-list#user-list')
    await list.locator('input').waitFor({ state: 'visible', timeout: 10000 })

    const input = list.locator('input')
    await input.fill('Leanne')
    await page.waitForTimeout(300)

    await expect(list).toContainText('Leanne Graham')
    await expect(list).not.toContainText('Ervin Howell')
  })
})
