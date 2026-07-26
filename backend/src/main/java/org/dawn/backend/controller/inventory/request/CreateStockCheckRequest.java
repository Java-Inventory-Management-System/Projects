package org.dawn.backend.controller.inventory.request;

public record CreateStockCheckRequest(
        String scopeType,
        Long scopeId,
        String note
) {}