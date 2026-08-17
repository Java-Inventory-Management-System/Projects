package org.dawn.backend.controller.catalog.request;

public record DefectCategoryRequest(
        String code,
        String name,
        String description,
        Boolean isRepairable,
        Boolean isReplaceable
) {}