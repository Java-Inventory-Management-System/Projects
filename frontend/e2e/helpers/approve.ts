import type { Page } from "@playwright/test"
import { expect } from "@playwright/test"

export async function approveDialog(
  page: Page,
  id: number | string,
  approveLabel = "Duyệt",
  confirmLabel = "Xác nhận",
) {
  const resp = page.waitForResponse(
    (r) => r.url().includes(`/${id}/approve`) && r.status() === 200,
  )
  const approveBtn = page.locator(`button:has-text("${approveLabel}")`)
  await expect(approveBtn).toBeVisible({ timeout: 10000 })
  await approveBtn.click()
  await page.locator(`button:has-text("${confirmLabel}")`).first().waitFor({ state: "visible", timeout: 5000 })
  await page.locator(`button:has-text("${confirmLabel}")`).first().click()
  await resp
}
