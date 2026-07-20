package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.LocationResponse;
import org.dawn.backend.entity.inventory.Location;

public interface LocationMappingHelper {

    static LocationResponse map(Location location) {
        return LocationResponse.builder()
                .id(location.getId())
                .zoneCode(location.getZoneCode())
                .shelfCode(location.getShelfCode())
                .binCode(location.getBinCode())
                .fullCode(location.getFullCode())
                .description(location.getDescription())
                .isActive(location.getIsActive())
                .createdAt(location.getCreatedAt())
                .updatedAt(location.getUpdatedAt())
                .build();
    }
}
