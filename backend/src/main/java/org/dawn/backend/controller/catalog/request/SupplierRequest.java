package org.dawn.backend.controller.catalog.request;

public record SupplierRequest(
        String name,
        String contactPerson,
        String phone,
        String email,
        String address,
        String taxCode,
        String note
) {
}
