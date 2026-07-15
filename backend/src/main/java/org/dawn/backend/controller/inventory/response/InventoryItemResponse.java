package org.dawn.backend.controller.inventory.response;

import java.time.Instant;

public record InventoryItemResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        int quantity,
        int minStock,
        String location,
        Instant updatedAt
) {}
