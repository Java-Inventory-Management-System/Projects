package org.dawn.backend.controller.inventory.request;

public record StockCheckScheduleRequest(
        String zoneCode,
        String binFrom,
        String binTo,
        Integer frequencyDays,
        Boolean isActive,
        Long defaultAssigneeId,
        String note
) {}