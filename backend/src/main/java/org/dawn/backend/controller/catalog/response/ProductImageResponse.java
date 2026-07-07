package org.dawn.backend.controller.catalog.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record ProductImageResponse(
        Long id,
        Long productId,
        String url,
        Boolean isPrimary,
        Integer sortOrder,
        Instant createdAt
) {
}
