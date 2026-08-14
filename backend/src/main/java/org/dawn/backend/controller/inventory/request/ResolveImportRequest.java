package org.dawn.backend.controller.inventory.request;

public record ResolveImportRequest(
        String resolution,
        String note
) {}