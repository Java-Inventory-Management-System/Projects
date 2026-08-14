package org.dawn.backend.service.inventory.box;

import lombok.RequiredArgsConstructor;
import org.dawn.backend.constant.enums.inventory.box.BoxType;
import org.dawn.backend.repository.inventory.ProductUnitRepository;
import org.dawn.backend.repository.inventory.box.BoxRepository;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Component
@RequiredArgsConstructor
public class BoxCapacity {

    private final ProductUnitRepository productUnitRepository;
    private final BoxRepository boxRepository;

    /**
     * Used capacity per location: loose units count individually, each sealed box
     * counts as its full box capacity (a small carton with 5 items occupies 20 slots).
     */
    public Map<Long, BigDecimal> usageByLocation() {
        Map<Long, BigDecimal> usage = new HashMap<>(productUnitRepository.usageByLocation());
        for (Object[] row : boxRepository.sealedBoxUsageRaw()) {
            Long locationId = (Long) row[0];
            BoxType boxType = (BoxType) row[1];
            long count = (Long) row[2];
            usage.merge(locationId,
                    BigDecimal.valueOf(boxType.maxUnits()).multiply(BigDecimal.valueOf(count)),
                    BigDecimal::add);
        }
        return usage;
    }
}
