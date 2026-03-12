import { expect, test } from '@playwright/test'

test('homepage has title and navigation', async ({ page }) => {
  await page.goto('/')

  await expect(page).toHaveTitle(/Lake Surface Water Temperature/)

  const playgroundLink = page.locator('text=Playground')
  await expect(playgroundLink).toBeVisible()

  const docsLink = page.locator('text=Documentation')
  await expect(docsLink).toBeVisible()
})

test('playground page has tool selection', async ({ page }) => {
  await page.goto('/playground')

  await expect(page.locator('text=Mutation Detection')).toBeVisible()
  await expect(page.locator('text=Segmentation Analysis')).toBeVisible()
})

test('can navigate to mutation tool', async ({ page }) => {
  await page.goto('/playground')

  await page.click('text=Mutation Detection')
  await expect(page).toHaveURL(/.*mutation/)
})

test('can navigate to segments tool', async ({ page }) => {
  await page.goto('/playground')

  await page.click('text=Segmentation Analysis')
  await expect(page).toHaveURL(/.*segments/)
})
