package org.dawn.backend.controller.inventory.request;

public record LocationRequest(
        String zoneCode,
        String shelfCode,
        String binCode,
        String description
) {}
