package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.util.List;

@Builder
public record StockCheckZoneStatusResponse(
        long pendingChecks,
        List<ZoneStatus> zones
) {
    @Builder
    public record ZoneStatus(
            String zoneCode,
            int clusterCount,
            int dueClusterCount
    ) {}
}