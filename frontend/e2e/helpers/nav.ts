import { Page, expect } from "@playwright/test"

export async function navigateTo(page: Page, path: string) {
  const isDetail = /\/\d+$/.test(path)
  if (!isDetail) {
    const sidebarLink = page.locator(`nav a[href="${path}"]`)
    if (await sidebarLink.isVisible()) {
      await sidebarLink.click()
      await page.waitForURL(`**${path}`, { timeout: 15000 })
      return
    }
  }
  await page.goto(path, { waitUntil: "networkidle" })
}

export async function expectOnPage(page: Page, titleText: string) {
  await expect(page.locator("h1").first()).toContainText(titleText)
}
