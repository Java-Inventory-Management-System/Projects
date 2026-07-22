package org.dawn.backend.controller.inventory.request;

import jakarta.validation.constraints.NotBlank;

public record LocationRequest(
        @NotBlank String zoneCode,
        @NotBlank String shelfCode,
        @NotBlank String binCode,
        String description
) {}
