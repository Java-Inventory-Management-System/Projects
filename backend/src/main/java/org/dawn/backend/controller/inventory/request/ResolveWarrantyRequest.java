package org.dawn.backend.controller.inventory.request;

import java.time.Instant;

public record ResolveWarrantyRequest(
        String resolutionType,
        Long replacementUnitId,
        String rmaNumber,
        Instant expectedReturnAt,
        String partnerNote,
        String note
) {}
