package org.dawn.backend.controller.inventory.request;

import java.util.List;

public record CreateStockCheckRequest(
        String scopeType,
        Long scopeId,
        List<String> shelfCodes,
        String note
) {}