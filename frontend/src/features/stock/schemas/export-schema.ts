import { z } from "zod"

export const exportLineItemSchema = z.object({
  tempId: z.number(),
  productId: z.number(),
  productName: z.string(),
  productSku: z.string(),
  quantity: z.number().min(1),
  unitPrice: z.number().min(0),
})

export const exportFormSchema = z.object({
  reason: z.string().min(1, "Vui lòng chọn lý do xuất"),
  customerId: z.string().optional(),
  note: z.string().optional(),
  items: z.array(exportLineItemSchema).min(1, "Chưa có sản phẩm nào"),
})

export type ExportFormData = z.infer<typeof exportFormSchema>
