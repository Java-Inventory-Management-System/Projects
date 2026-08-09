package org.dawn.backend.controller.inventory.request;

import java.util.List;

public record ConfirmStockCheckBoxesRequest(
        List<Long> boxIds
) {}
