/**
 * Browser render tests — real DOM, Shadow DOM, component interactions.
 * Uses demo bundle (runtime + components) built via `npm run build:bundle`.
 * Screenshots saved to ss/ (gitignored).
 *
 * Run: npm run test:browser
 */
import { test, expect } from '@playwright/test'
import { mkdirSync, existsSync } from 'node:fs'

const SS_DIR = 'ss'
const MOCK_USERS = [
  { id: 1, name: 'Leanne Graham', email: 'leanne@example.com' },
  { id: 2, name: 'Ervin Howell', email: 'ervin@example.com' },
]

function mockUsersApi(page: import('@playwright/test').Page) {
  return page.route('**/jsonplaceholder.typicode.com/users**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(MOCK_USERS),
    }),
  )
}

test.describe('Bundle load', () => {
  test('Wely bundle loads and registers components', async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-counter', { state: 'attached' })

    const loaded = await page.evaluate(() => (window as any).Wely !== undefined)
    expect(loaded).toBe(true)

    const counter = page.locator('w-counter#counter')
    await expect(counter).toBeVisible()
  })
})

test.describe('w-counter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-counter#counter', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({ path: `${SS_DIR}/${name}-${testInfo.project.name}.png`, fullPage: true }).catch(() => {})
  })

  test('renders with shadow DOM', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    await expect(counter).toBeVisible()
    const hasShadow = await counter.evaluate((el) => el.shadowRoot !== null)
    expect(hasShadow).toBe(true)
  })

  test('displays initial count from start prop', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const text = await counter.locator('span').first().textContent()
    expect(text?.trim()).toBe('5')
  })

  test('increment updates display', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const incBtn = counter.getByRole('button', { name: '+' })

    await incBtn.click()
    await expect(counter.locator('span').first()).toHaveText('6')

    await incBtn.click()
    await expect(counter.locator('span').first()).toHaveText('7')
  })

  test('decrement updates display', async ({ page }) => {
    const counter = page.locator('w-counter#counter')
    const decBtn = counter.getByRole('button', { name: '-' })

    await decBtn.click()
    await expect(counter.locator('span').first()).toHaveText('4')
  })
})

test.describe('w-button', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-button#btn', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({ path: `${SS_DIR}/${name}-${testInfo.project.name}.png`, fullPage: true }).catch(() => {})
  })

  test('renders with label', async ({ page }) => {
    const btn = page.locator('w-button#btn')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Click me')
  })

  test('fires w-click on click', async ({ page }) => {
    await page.evaluate(() => {
      ;(window as any).__clickFired = false
      document.querySelector('w-button#btn')?.addEventListener('w-click', () => {
        ;(window as any).__clickFired = true
      })
    })
    await page.locator('w-button#btn >> button').click()
    const fired = await page.evaluate(() => (window as any).__clickFired)
    expect(fired).toBe(true)
  })

  test('variant primary renders', async ({ page }) => {
    const btn = page.locator('w-button#btn-primary')
    await expect(btn).toBeVisible()
    await expect(btn).toContainText('Primary')
  })

  test('disabled does not fire w-click', async ({ page }) => {
    await page.evaluate(() => {
      ;(window as any).__disabledClickFired = false
      document.querySelector('w-button#btn-disabled')?.addEventListener('w-click', () => {
        ;(window as any).__disabledClickFired = true
      })
    })
    await page.locator('w-button#btn-disabled >> button').click({ force: true })
    const fired = await page.evaluate(() => (window as any).__disabledClickFired)
    expect(fired).toBe(false)
  })
})

test.describe('w-counter-card', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-counter-card#counter-card', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({ path: `${SS_DIR}/${name}-${testInfo.project.name}.png`, fullPage: true }).catch(() => {})
  })

  test('renders nested w-counter', async ({ page }) => {
    const card = page.locator('w-counter-card#counter-card')
    await expect(card).toBeVisible()

    const innerCounter = card.locator('w-counter')
    await expect(innerCounter).toBeVisible()
    await expect(innerCounter.locator('span').first()).toHaveText('10')
  })

  test('Action button fires w-click and updates lastEvent', async ({ page }) => {
    const card = page.locator('w-counter-card#counter-card')
    await card.locator('w-button >> button').first().click()

    await expect(card).toContainText(/Button clicked at \d{2}:\d{2}:\d{2}/)
  })
})

test.describe('w-pokemon-grid', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-pokemon-grid#pokemon-grid', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({ path: `${SS_DIR}/${name}-${testInfo.project.name}.png`, fullPage: true }).catch(() => {})
  })

  test('renders and loads Pokémon', async ({ page }) => {
    const grid = page.locator('w-pokemon-grid#pokemon-grid')
    await expect(grid).toBeVisible()

    await expect(
      grid.locator('text=bulbasaur').or(grid.locator('text=ivysaur')).or(grid.locator('text=Loading')).first(),
    ).toBeVisible({ timeout: 15000 })
  })

  test('shows grid when loaded', async ({ page }) => {
    const grid = page.locator('w-pokemon-grid#pokemon-grid')
    await grid.locator('.grid').waitFor({ state: 'visible', timeout: 20000 })

    const cards = grid.locator('.rounded-xl')
    await expect(cards.first()).toBeVisible()
    expect(await cards.count()).toBeGreaterThanOrEqual(1)
  })
})

test.describe('w-user-list', () => {
  test.beforeEach(async ({ page }) => {
    mockUsersApi(page)
    await page.goto('/test/browser/index.html')
    await page.waitForSelector('w-user-list#user-list', { state: 'attached' })
  })

  test.afterEach(async ({ page }, testInfo) => {
    if (!existsSync(SS_DIR)) mkdirSync(SS_DIR, { recursive: true })
    const name = testInfo.title.replace(/\s+/g, '-').replace(/[^\w-]/g, '') || 'untitled'
    await page.screenshot({ path: `${SS_DIR}/${name}-${testInfo.project.name}.png`, fullPage: true }).catch(() => {})
  })

  test('renders and loads users', async ({ page }) => {
    const list = page.locator('w-user-list#user-list')
    await expect(list).toBeVisible()
    await expect(list.locator('text=Leanne Graham')).toBeVisible({ timeout: 10000 })
  })

  test('filter input filters results', async ({ page }) => {
    const list = page.locator('w-user-list#user-list')
    await list.locator('input').waitFor({ state: 'visible', timeout: 10000 })

    await list.locator('input').fill('Leanne')

    await expect(list).toContainText('Leanne Graham')
    await expect(list).not.toContainText('Ervin Howell')
  })
})
