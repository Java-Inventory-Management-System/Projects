import { Page } from "@playwright/test"

export async function login(page: Page, username: string, password: string) {
  await page.goto("/login", { waitUntil: "networkidle" })
  await page.waitForTimeout(500)
  await page.fill("#username", username)
  await page.fill("#password", password)
  await page.click('button[type="submit"]')
  await page.waitForFunction(() => !window.location.pathname.includes("/login"), { timeout: 15000 })
}

export async function loginAsAdmin(page: Page) {
  await login(page, "admin", "123456")
}

export async function loginAsManager(page: Page) {
  await login(page, "manager", "123456")
}

export async function loginAsStock(page: Page) {
  await login(page, "stock", "123456")
}

export async function loginAsSales(page: Page) {
  await login(page, "sales", "123456")
}

export async function setToken(page: Page, token: string) {
  await page.evaluate((t) => localStorage.setItem("accessToken", t), token)
  await page.goto("/")
  await page.waitForURL(/^\/(?!login)/, { timeout: 10000 })
}
