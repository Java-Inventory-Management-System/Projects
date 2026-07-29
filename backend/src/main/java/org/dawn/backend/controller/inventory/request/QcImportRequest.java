package org.dawn.backend.controller.inventory.request;

import java.util.List;

public record QcImportRequest(
        List<QcItem> items
) {
    public record QcItem(
            Long unitId,
            String result,
            String note
    ) {}
}
