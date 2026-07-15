package org.dawn.backend.controller.dashboard.response;

import lombok.Builder;

@Builder
public record DashboardResponse(
        long totalProducts,
        long totalItems,
        long lowStockCount,
        long activeProducts
) {}
