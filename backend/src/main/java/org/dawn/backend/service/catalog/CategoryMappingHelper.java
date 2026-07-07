package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.CategoryResponse;
import org.dawn.backend.entity.catalog.Category;

public interface CategoryMappingHelper {

    static CategoryResponse map(Category c) {
        return CategoryResponse.builder()
                .id(c.getId())
                .name(c.getName())
                .description(c.getDescription())
                .isActive(c.getIsActive())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .build();
    }
}
