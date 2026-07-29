package org.dawn.backend.controller.inventory.request;

import jakarta.validation.constraints.NotNull;

public record RelocateRequest(
        @NotNull Long sourceBinId,
        @NotNull Long destBinId,
        Integer quantity
) {}