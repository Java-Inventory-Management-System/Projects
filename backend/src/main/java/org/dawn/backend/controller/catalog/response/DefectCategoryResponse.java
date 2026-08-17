package org.dawn.backend.controller.catalog.response;

public record DefectCategoryResponse(
        Long id,
        String code,
        String name,
        String description,
        Boolean isRepairable,
        Boolean isReplaceable,
        Boolean isActive
) {}