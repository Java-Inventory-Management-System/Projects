package org.dawn.backend.controller.inventory.request;

import java.math.BigDecimal;
import java.util.List;

import org.dawn.backend.constant.enums.inventory.box.BoxType;

public record SealBoxRequest(
        List<Long> unitIds,
        List<SealBoxItem> items,
        Long locationId,
        String note,
        BoxType boxType
) {
    public record SealBoxItem(
            Long unitId,
            BigDecimal quantity
    ) {}
}
