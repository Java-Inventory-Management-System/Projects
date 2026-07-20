package org.dawn.backend.controller.inventory.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record WarrantyRequestResponse(
        Long id,
        String requestCode,
        Long productUnitId,
        String serialNumber,
        Long productId,
        String productName,
        String productSku,
        Long customerId,
        String customerName,
        String issueDescription,
        String resolutionType,
        Long replacementUnitId,
        String replacementSerialNumber,
        String rmaNumber,
        Instant sentToPartnerAt,
        Instant expectedReturnAt,
        String partnerNote,
        String status,
        Long handledBy,
        String handledByName,
        Instant completedAt,
        String note,
        Instant createdAt,
        Instant updatedAt
) {}
