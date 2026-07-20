package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

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
        Instant createdAt,
        Instant updatedAt
) {}
