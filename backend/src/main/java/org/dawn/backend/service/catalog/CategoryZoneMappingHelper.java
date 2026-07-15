package org.dawn.backend.service.catalog;

import org.dawn.backend.controller.catalog.response.CategoryZoneResponse;
import org.dawn.backend.entity.catalog.CategoryZone;

public interface CategoryZoneMappingHelper {
    static CategoryZoneResponse map(CategoryZone cz) {
        return CategoryZoneResponse.builder()
                .id(cz.getId())
                .categoryId(cz.getCategoryId())
                .zoneCode(cz.getZoneCode())
                .build();
    }
}
