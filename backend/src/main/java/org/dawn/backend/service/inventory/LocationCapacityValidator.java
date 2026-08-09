package org.dawn.backend.service.inventory;
import org.dawn.backend.constant.shared.ErrorCode;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.entity.inventory.Location;
import org.dawn.backend.exception.type.InvalidRequestException;
import org.dawn.backend.repository.inventory.LocationRepository;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collection;

@Component
@RequiredArgsConstructor
public class LocationCapacityValidator {

    private final LocationRepository locationRepository;
    private final ProductUnitRepository productUnitRepository;

    public void assertCapacity(Long locationId, BigDecimal incoming) {
        assertCapacity(locationId, incoming, java.util.List.of());
    }

    /**
     * Units in {@code excludedUnitIds} that are already at this location are subtracted from the
     * used count first, so placing them back (sealing/moving a box to the bin they already occupy)
     * is not double-counted.
     */
    public void assertCapacity(Long locationId, BigDecimal incoming, Collection<Long> excludedUnitIds) {
        if (locationId == null) return;
        Location location = locationRepository.findByIdForUpdate(locationId).orElse(null);
        if (location == null || location.getMaxCapacity() == null) return;
        if (!Boolean.TRUE.equals(location.getIsActive())) {
            throw new InvalidRequestException(ErrorCode.LOCATION_INACTIVE.format(location.getFullCode()));
        }
        BigDecimal used = productUnitRepository.usageByLocation().getOrDefault(locationId, BigDecimal.ZERO);
        if (excludedUnitIds != null && !excludedUnitIds.isEmpty()) {
            BigDecimal excludedAtThisBin = productUnitRepository.usageByLocationIdAndIdIn(locationId, excludedUnitIds);
            used = used.subtract(excludedAtThisBin);
        }
        if (used.add(incoming).compareTo(location.getMaxCapacity()) > 0) {
            throw new InvalidRequestException(ErrorCode.LOCATION_CAPACITY_EXCEEDED.format(
                    location.getFullCode(), used, location.getMaxCapacity()));
        }
    }
}