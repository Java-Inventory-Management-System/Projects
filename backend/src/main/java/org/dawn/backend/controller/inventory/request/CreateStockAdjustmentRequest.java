package org.dawn.backend.controller.inventory.request;

public record CreateStockAdjustmentRequest(
        String type,
        Long productUnitId,
        Long productId,
        Integer quantity,
        String reason,
        String imageUrl
) {}
