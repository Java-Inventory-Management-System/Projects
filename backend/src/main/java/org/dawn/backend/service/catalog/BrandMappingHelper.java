package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.BrandResponse;
import org.dawn.backend.entity.catalog.Brand;

public interface BrandMappingHelper {

    static BrandResponse map(Brand b) {
        return BrandResponse.builder()
                .id(b.getId())
                .name(b.getName())
                .description(b.getDescription())
                .isActive(b.getIsActive())
                .createdAt(b.getCreatedAt())
                .updatedAt(b.getUpdatedAt())
                .build();
    }
}
