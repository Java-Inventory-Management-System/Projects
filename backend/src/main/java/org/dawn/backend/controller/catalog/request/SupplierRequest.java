package org.dawn.backend.controller.catalog.request;

import jakarta.validation.constraints.NotBlank;

public record SupplierRequest(
        @NotBlank String name,
        String contactPerson,
        String phone,
        String email,
        String address,
        String taxCode,
        String note
) {
}
