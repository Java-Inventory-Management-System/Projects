package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

@Builder
public record StockCheckScheduleResponse(
        Long id,
        String zoneCode,
        String shelfFrom,
        String shelfTo,
        Integer frequencyDays,
        Boolean isActive,
        Long defaultAssigneeId,
        String defaultAssigneeName,
        String note
) {}