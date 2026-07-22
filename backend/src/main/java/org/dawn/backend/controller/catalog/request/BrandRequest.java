package org.dawn.backend.controller.catalog.request;

import jakarta.validation.constraints.NotBlank;

public record BrandRequest(@NotBlank String name, String description) {
}
