package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record InventoryItemResponse(
        Long productId,
        String productName,
        String productSku,
        int quantity,
        int minStock,
        String location,
        Instant updatedAt
) {}
