import { z } from "zod"

export const importLineItemSchema = z.object({
  tempId: z.number(),
  productId: z.number(),
  productName: z.string(),
  productSku: z.string(),
  categoryId: z.number().nullable(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
  warrantyMonths: z.number().min(0),
  serials: z.array(z.string()),
  locationId: z.string(),
})

export const importFormSchema = z.object({
  supplierId: z.string().min(1, "Vui lòng chọn nhà cung cấp"),
  receiptDate: z.string().min(1, "Vui lòng chọn ngày nhập"),
  referenceDoc: z.string().optional(),
  note: z.string().optional(),
  items: z.array(importLineItemSchema).min(1, "Chưa có sản phẩm nào"),
})

export type ImportFormData = z.infer<typeof importFormSchema>
