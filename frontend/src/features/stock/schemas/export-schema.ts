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
  type: z.string().min(1, "exportSchema.requiredReason"),
  customerId: z.string().optional(),
  customReason: z.string().optional(),
  items: z.array(exportLineItemSchema).min(1, "exportSchema.requiredItems"),
})

export type ExportFormData = z.infer<typeof exportFormSchema>
