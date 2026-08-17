package org.dawn.backend.controller.inventory.request;

public record StockCheckScheduleRequest(
        String zoneCode,
        String shelfFrom,
        String shelfTo,
        Integer frequencyDays,
        Boolean isActive,
        Long defaultAssigneeId,
        String note
) {}