package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
public record LocationResponse(
        Long id,
        String zoneCode,
        String shelfCode,
        String binCode,
        String fullCode,
        String description,
        Boolean isActive,
        BigDecimal maxCapacity,
        Instant createdAt,
        Instant updatedAt
) {}
