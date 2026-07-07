package org.dawn.backend.controller.catalog.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record CategoryResponse(
        Long id,
        String name,
        String description,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
