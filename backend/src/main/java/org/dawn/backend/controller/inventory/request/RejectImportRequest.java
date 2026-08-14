package org.dawn.backend.controller.inventory.request;

public record RejectImportRequest(
        String reason,
        String evidenceImageUrl
) {}
