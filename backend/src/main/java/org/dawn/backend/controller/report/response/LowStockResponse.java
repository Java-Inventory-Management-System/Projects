package org.dawn.backend.controller.report.response;

import lombok.Builder;

@Builder
public record LowStockResponse(
        Long productId,
        String productName,
        String productSku,
        int quantity,
        int minStock
) {}
