import { describe, expect, it } from "vitest"
import { computeDiffRows, humanizeFieldName } from "@/utils/audit-diff"

describe("computeDiffRows", () => {
  it("added: old=null, array → N mục, object có name → tên", () => {
    const { rows } = computeDiffRows(
      null,
      JSON.stringify({
        totalQuantity: 20,
        supplier: { id: 1, name: "ABC Co" },
        items: [1, 2, 3],
      }),
      ["receiptCode", "status"],
    )
    const supplier = rows.find((r) => r.key === "supplier")
    expect(supplier?.kind).toBe("added")
    expect(supplier?.newDisplay).toBe("ABC Co")
    const items = rows.find((r) => r.key === "items")
    expect(items?.newDisplay).toBe("3 mục")
    expect(rows.find((r) => r.key === "totalQuantity")?.newDisplay).toBe("20")
  })

  it("changed: falsy isActive=false hiện đúng, không bị coi là empty", () => {
    const { rows } = computeDiffRows('{"isActive":false}', '{"isActive":true}')
    const row = rows.find((r) => r.key === "isActive")
    expect(row?.kind).toBe("changed")
    expect(row?.oldDisplay).toBe("false")
    expect(row?.newDisplay).toBe("true")
  })

  it("removed: field bị xóa hiện − với giá trị cũ", () => {
    const { rows } = computeDiffRows('{"sellPrice":1000}', '{"sellPrice":null}')
    const row = rows.find((r) => r.key === "sellPrice")
    expect(row?.kind).toBe("removed")
    expect(row?.oldDisplay).toBe("1000")
    expect(row?.newDisplay).toBeUndefined()
  })

  it("field trùng exclude bị loại khỏi diff", () => {
    const { rows } = computeDiffRows('{"status":"PENDING"}', '{"status":"APPROVED"}', ["status"])
    expect(rows.find((r) => r.key === "status")).toBeUndefined()
  })

  it("tổng field không bị rơi mất ngoài ý muốn", () => {
    const newObj = { a: 1, b: null, c: "x", d: "x" }
    const oldObj = { a: 1, b: null, c: "y", d: "x" }
    const { rows } = computeDiffRows(JSON.stringify(oldObj), JSON.stringify(newObj), [])
    expect(rows).toHaveLength(1)
    expect(rows[0].key).toBe("c")
    expect(rows[0].kind).toBe("changed")
    expect(rows[0].oldDisplay).toBe("y")
    expect(rows[0].newDisplay).toBe("x")
  })

  it("array rỗng bị coi như null → ẩn", () => {
    const { rows } = computeDiffRows(null, JSON.stringify({ items: [], name: "x" }), [])
    expect(rows.find((r) => r.key === "items")).toBeUndefined()
    expect(rows.find((r) => r.key === "name")?.newDisplay).toBe("x")
  })

  it("giới hạn 8 field, số dư báo qua truncated", () => {
    const obj: Record<string, number> = {}
    for (let i = 1; i <= 10; i++) obj[`f${i}`] = i
    const { rows, truncated } = computeDiffRows(null, JSON.stringify(obj), [])
    expect(rows).toHaveLength(8)
    expect(truncated).toBe(2)
  })

  it("field thời gian format dạng đọc được, không ISO thô", () => {
    const { rows } = computeDiffRows(null, JSON.stringify({ expiryDate: "2026-12-31T00:00:00Z" }), [])
    const row = rows.find((r) => r.key === "expiryDate")
    expect(row?.newDisplay).toMatch(/2026/)
    expect(row?.newDisplay).not.toContain("2026-12-31T")
  })

  it("label humanize đọc được: camelCase → Title Case, giữ acronym", () => {
    expect(humanizeFieldName("totalQuantity")).toBe("Total Quantity")
    expect(humanizeFieldName("brandName")).toBe("Brand Name")
    expect(humanizeFieldName("sku")).toBe("SKU")
    expect(humanizeFieldName("isActive")).toBe("Is Active")
    expect(humanizeFieldName("supplierIds")).toBe("Supplier IDs")
  })

  it("ghép cặp oldX/newX cùng base thành 1 dòng changed", () => {
    const { rows } = computeDiffRows(null, JSON.stringify({ oldPrice: 3899000, newPrice: 3499000 }), [])
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ key: "Price", label: "Price", kind: "changed", oldDisplay: "3899000", newDisplay: "3499000" })
  })

  it("ghép cặp khi old/new nằm ở 2 object", () => {
    const { rows } = computeDiffRows(
      JSON.stringify({ oldPrice: 3899000 }),
      JSON.stringify({ newPrice: 3499000 }),
      [],
    )
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ key: "Price", kind: "changed", oldDisplay: "3899000", newDisplay: "3499000" })
  })

  it("không ghép khi base trùng key thật", () => {
    const { rows } = computeDiffRows(null, JSON.stringify({ oldPrice: 100, newPrice: 90, price: 80 }), [])
    expect(rows.filter((r) => r.kind === "changed")).toHaveLength(0)
    expect(rows).toHaveLength(3)
  })

  it("field đã vào message (messageFields) bị loại khỏi diff", () => {
    const { rows } = computeDiffRows(
      JSON.stringify({ status: "PENDING", sellPrice: 1000, name: "a" }),
      JSON.stringify({ status: "APPROVED", sellPrice: 2000, name: "b" }),
      ["status", "sellPrice"],
    )
    expect(rows.find((r) => r.key === "status")).toBeUndefined()
    expect(rows.find((r) => r.key === "sellPrice")).toBeUndefined()
    expect(rows.find((r) => r.key === "name")?.label).toBe("Name")
  })
})
