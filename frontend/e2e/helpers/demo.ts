import type { Page } from "@playwright/test"

// Demo helpers — chia sẻ giữa các demo*.spec.ts

export function chapter(title: string) {
  console.log(`\n════════ ${title} ════════`)
}

export function log(role: string, msg: string) {
  console.log(`  [${role}]  ${msg}`)
}

export async function hold(page: Page, ms = 10_000) {
  console.log("  Giữ cửa sổ mở " + ms / 1000 + " giây để bạn xem kết quả...")
  await page.waitForTimeout(ms)
}
