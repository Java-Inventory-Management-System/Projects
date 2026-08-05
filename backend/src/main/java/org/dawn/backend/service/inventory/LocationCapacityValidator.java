package org.dawn.backend.service.inventory;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.shared.Message;
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
        Location location = locationRepository.findById(locationId).orElse(null);
        if (location == null || location.getMaxCapacity() == null) return;
        BigDecimal used = productUnitRepository.usageByLocation().getOrDefault(locationId, BigDecimal.ZERO);
        if (excludedUnitIds != null && !excludedUnitIds.isEmpty()) {
            BigDecimal excludedAtThisBin = productUnitRepository.usageByLocationIdAndIdIn(locationId, excludedUnitIds);
            used = used.subtract(excludedAtThisBin);
        }
        if (used.add(incoming).compareTo(location.getMaxCapacity()) > 0) {
            throw new InvalidRequestException(Message.format(
                    Message.Inventory.LOCATION_CAPACITY_EXCEEDED,
                    location.getFullCode(), used, location.getMaxCapacity()));
        }
    }
}