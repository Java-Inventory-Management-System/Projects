package org.dawn.backend.controller.inventory.request;

import java.util.List;

public record CreateStockCheckRequest(
        String note,
        List<Long> productUnitIds
) {}
