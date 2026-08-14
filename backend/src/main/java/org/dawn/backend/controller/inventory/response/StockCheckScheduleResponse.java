package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

@Builder
public record StockCheckScheduleResponse(
        Long id,
        String zoneCode,
        String binFrom,
        String binTo,
        Integer frequencyDays,
        Boolean isActive,
        Long defaultAssigneeId,
        String defaultAssigneeName,
        String note
) {}