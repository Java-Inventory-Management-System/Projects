package org.dawn.backend.service.inventory;

import org.dawn.backend.controller.inventory.response.LocationResponse;
import org.dawn.backend.entity.inventory.Location;

public interface LocationMappingHelper {

    static LocationResponse map(Location location) {
        return new LocationResponse(
                location.getId(),
                location.getZoneCode(),
                location.getShelfCode(),
                location.getBinCode(),
                location.getFullCode(),
                location.getDescription(),
                location.getIsActive(),
                location.getCreatedAt(),
                location.getUpdatedAt()
        );
    }
}
