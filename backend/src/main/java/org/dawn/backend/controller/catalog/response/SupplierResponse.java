package org.dawn.backend.controller.catalog.response;

import lombok.Builder;

import java.time.Instant;

@Builder
public record SupplierResponse(
        Long id,
        String name,
        String contactPerson,
        String phone,
        String email,
        String address,
        String taxCode,
        String note,
        Boolean isActive,
        Instant createdAt,
        Instant updatedAt
) {
}
