package org.dawn.backend.controller.catalog.response;

import lombok.Builder;

@Builder
public record CategoryZoneResponse(
        Long id,
        Long categoryId,
        String zoneCode
) {}
