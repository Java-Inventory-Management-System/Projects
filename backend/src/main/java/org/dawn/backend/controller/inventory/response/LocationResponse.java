package org.dawn.backend.controller.inventory.response;

import java.time.Instant;

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
